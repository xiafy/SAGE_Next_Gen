# SAGE 图片识别链路完整测试报告 & 改造方案

**测试日期**: 2026-03-02  
**测试人**: SAGE Agent + Mr. Xia  
**测试环境**: Mac Mini（国内）→ Cloudflare Worker（东京）→ AI API  
**测试图片**: `tests/prompt-lab/test-images/real-thai/03_main_dishes_1.jpg`（161KB，真实泰餐菜单）  
**相关决策**: DEC-044、DEC-045

---

## 一、背景与问题

SAGE 图片识别链路上线后，完整识别一张菜单需要 **~25 秒**，用户体验极差。本次测试目标：

1. 找出真正的延迟瓶颈在哪里
2. 量化每个优化手段的实际收益
3. 给出下一阶段的改造方案和预期效果

---

## 二、测试过程与关键发现

### 测试 1｜链路拆解（03:04–03:15）

目标：定位「跨境中转」vs「模型推理」各占多少。

| 测试项 | 均值 | 说明 |
|--------|------|------|
| T1: Mac → CF Worker RTT | 349ms | 10次，极稳定（341–370ms） |
| T2: Mac → 百炼文本直连 | 2,210ms | qwen3.5-flash，stream=false |
| T3: Mac → 百炼 VL 直连 | 24,621ms | qwen3-vl-flash，stream=false |
| T4: Worker 完整链路 | 25,071ms | multipart + SSE + 两阶段 |
| T5: 百炼两阶段直连 | 12,762ms | VL(10,483ms) + Enrich(2,279ms) |

**❌ 原先假设**：跨境中转（国内→东京→国内）是主要瓶颈。  
**✅ 实际结论**：Mac→Worker 单程仅 349ms，往返 ~700ms，占总链路 2.8%。**真正瓶颈是 qwen3-vl-flash 模型推理本身（~20–25s）。**

---

### 测试 2｜关闭 Thinking 模式（08:50）

假设：qwen3-vl-flash 默认开启 Chain-of-Thought，关掉能显著降低 TTFT。

测试参数：`stream=true` + `enable_thinking=false`

| 指标 | 结果 |
|------|------|
| TTFT | 3,024ms |
| 总耗时 | 23,737ms |

**结论**：关闭推理对 VL 模型 **没有显著帮助**。DEC-028 记录的 <500ms TTFT 是文本模型（qwen3.5-flash）的数据，VL 模型本身推理就要 3s 才能输出第一个 token。**换模型才是出路，不是调参数。**

---

### 测试 3｜stream=false vs stream=true（10:09）⭐ 关键发现

假设：VL 输出是 JSON，必须等完整结果，stream=true 可能反而增加开销。

直连百炼，各测 2 次：

| 模式 | 第1次 | 第2次 | 均值 |
|------|-------|-------|------|
| `stream=false`（非流式） | 14,697ms | 11,893ms | **13,300ms** |
| `stream=true`（流式聚合） | 35,840ms | 26,974ms | **31,400ms** |

**stream=false 比 stream=true 快约 2.4 倍。**

根因分析：
- `stream=true` 时，API 服务端每生成一个 token 立刻 flush → 大量小 HTTP 分块帧 → 每帧解析累积开销 + 可能阻止服务端内部批量优化
- `stream=false` 时，服务端完整推理后一次性返回，触发批量优化路径
- JSON 输出场景下，前端必须收到完整 JSON 才能 parse，`stream=true` 对 UX **没有任何收益**

**→ 决策 DEC-044：Worker 内部 VL+Enrich 调用一律改 `stream=false`。**

---

### 测试 4｜Gemini 2.0 Flash 直连测速（10:18）

目标：测试更快的 VL 模型。

| 模式 | 第1次 | 第2次 | 第3次 | 均值 |
|------|-------|-------|-------|------|
| stream=false | 8,605ms | 7,843ms | 8,151ms | **8,200ms** |
| stream=true（TTFT） | 7,888ms（TTFT 2,724ms） | 7,660ms（TTFT 2,819ms） | — | **7,800ms** |

**Gemini 2.0 Flash 比 qwen3-vl-flash 快约 1.6 倍（直连）。**

识别质量：中文翻译准确，价格完整，与 qwen3-vl-flash 相当。

额外优势：Gemini 使用 Google 全球 CDN，CF 东京节点可就近访问，无跨境路由劣势。

**→ 决策 DEC-045：Worker VL 阶段换用 Gemini 2.0 Flash。**

---

### 测试 5｜Worker 完整链路阶段分析（接入 Gemini 后）

通过 SSE progress 事件精确测量各阶段：

```
[877ms]   → analyzing 开始（Gemini VL 调用）
[8,937ms] → validating（Gemini VL 完成）     ← VL 耗时 8,060ms ✅
[9,121ms] → enriching 开始（Enrich 调用）
[22,659ms]→ result 推送                      ← Enrich 耗时 13,538ms ❌
总计: 22,937ms
```

**新瓶颈：Enrich 阶段（qwen3.5-flash）从 CF 东京调百炼，跨境耗时 ~13.5s。**

本地直连 qwen3.5-flash 仅 ~2.2s，说明是 CF 东京→百炼（国内）的跨境延迟问题，与 VL 阶段同样的跨境开销被激活。

**→ 同样换 Gemini 2.0 Flash 处理 Enrich。**

---

### 测试 6｜Enrich 换 Gemini 后的 Worker 链路

```
[877ms]    → analyzing 开始
[8,987ms]  → validating（VL 完成）           ← VL 8,110ms ✅
[9,150ms]  → enriching 开始
[19,102ms] → result                           ← Enrich 9,952ms（改善 3.6s）
总计: 19,373ms
```

改善：22.9s → **19.4s**，节省 3.5s。但 Enrich 仍需 ~10s（输出 20 道菜 × 5 字段，token 量大）。

---

### 测试 7｜VL + Enrich 单次调用（一次搞定）

假设：Gemini 是多模态原生模型，一次调用同时输出 OCR + 语义字段，省去第二次 API 调用。

| 次数 | 耗时 |
|------|------|
| 第1次 | 15,260ms |
| 第2次 | 15,040ms |
| 第3次 | 15,033ms |
| **均值** | **15,110ms** |

质量检查（24道菜，字段完整性 100%）：

| 字段 | 完整率 | 质量评估 |
|------|--------|----------|
| brief | 24/24 | 主菜优秀，变体菜退化（"猪肉+泰式炒河粉"） |
| briefDetail | 24/24 | 主菜优秀，变体菜复读 |
| spiceLevel | 24/24 | ✅ 比两阶段更准（看图推断：炒河粉1/罗勒3/蒜香2） |
| allergens | 24/24 | ✅ 虾类正确标注 shellfish，素食标 vegetarian |

**结论：单次调用不划算。**
- 仅比两阶段快 4s（15s vs 19s），但输出 token 翻倍导致推理更慢
- 变体菜品 brief 质量明显退化
- 最重要的：对 UX 帮助远不如两阶段 SSE 方案（后者用户 8s 就能看到内容）

---

## 三、数据汇总

### 各版本完整链路耗时对比

| 版本 | VL 阶段 | Enrich 阶段 | 总耗时 | 用户等待（看到内容） |
|------|---------|-------------|--------|----------------------|
| 初始版（qwen3-vl stream=true） | ~22s | ~3s | **~25s** | 25s |
| 换 stream=false（DEC-044） | ~13s* | ~2s* | **~15s*** | 15s |
| Worker 实测 qwen3-vl stream=false | ~N/A | ~N/A | **~23s** | 23s |
| 接入 Gemini VL + qwen3.5 Enrich | **8.1s** | 13.6s | **22.9s** | 22.9s |
| 接入 Gemini VL + Gemini Enrich | **8.1s** | **10.0s** | **19.4s** | 19.4s |
| 单次 Gemini（合并） | — | — | **15.1s** | 15.1s |
| **目标方案（两阶段 SSE）** | **8.1s** | **10.0s** | **~18s** | **~8s ✅** |

*直连测试数据，Worker 实测因跨境有加成

### 各模型性能对比（直连）

| 模型 | 任务 | stream | 耗时 |
|------|------|--------|------|
| qwen3-vl-flash | VL OCR | false | ~13.3s |
| qwen3-vl-flash | VL OCR | true | ~31.4s |
| qwen3.5-flash | Enrich（文本） | false | ~2.2s（直连） / ~13.5s（跨境） |
| **Gemini 2.0 Flash** | **VL OCR** | **false** | **~8.2s ✅** |
| **Gemini 2.0 Flash** | **Enrich（文本）** | **false** | **~10s（Worker）** |
| Gemini 2.0 Flash | VL + Enrich（合并） | false | ~15.1s |

---

## 四、改造方案

### 方案：两阶段 SSE 推送（推荐，立即实施）

**核心思路**：VL 完成（8s）立即推送基础菜单，Enrich 完成（+10s）静默补全语义字段。

**用户体验变化**：

```
现在：████████████████████ 19s 后看到完整内容

改后：████████ 8s 看到菜名+价格+翻译
              ██████████ +10s 辣度/过敏原/简介静默补全
```

**体感响应时间：19s → 8s（提升 2.4 倍）**

#### Worker 改动（`handlers/analyze.ts`）

新增一个 `partial_result` SSE 事件，在 VL 完成、Enrich 开始前推送：

```
事件流：
  progress(uploading, 10%)
  progress(preparing, 20%)
  progress(analyzing, 55%)
  ← VL 完成（~8s）→
  partial_result { ok:true, data: { items[基础字段], categories, ... } }   ← 新增
  progress(enriching, 85%)
  ← Enrich 完成（+10s）→
  result { ok:true, data: { items[完整字段], ... } }
  done
```

改动范围：`runAnalyzePipeline()` 中 Enrich 开始前插入一次 `emit('partial_result', ...)`，约 **5 行代码**。

#### 前端改动（`views/AgentChatView.tsx`）

接到 `partial_result` 时立即渲染菜单（菜名、价格、翻译已够用），显示 Enrich loading skeleton；接到 `result` 时静默 merge 补全字段。

改动范围：SSE 事件处理逻辑增加 `partial_result` case，约 **20 行代码**。

#### 预期效果

| 指标 | 改前 | 改后 |
|------|------|------|
| 用户看到菜单 | 19s | **~8s** |
| 完整信息（辣度/过敏原） | 19s | ~18s（静默完成） |
| 识别失败体验 | 19s 超时 | 8s 拿到基础结果（Enrich 失败不影响） |

---

## 五、进一步优化方向（Backlog）

### 5.1 Enrich 加速（~3–5s）

当前 Enrich 10s 的原因：20 道菜 × 5 字段，输出 token 量大。

优化选项：
- **精简 Prompt**：去掉 `briefDetail`，只保留 `brief` + `spiceLevel` + `allergens`（输出 token 减半 → 预计 ~5s）
- **按需加载**：用户点开菜品详情卡时才加载 allergens/briefDetail（Enrich 仅处理 brief + spiceLevel）
- **客户端辅助**：spiceLevel 可以根据菜名关键词在前端本地推断（零延迟）

### 5.2 更快的 VL 模型

Gemini 2.0 Flash 已是目前测试中最快（~8s），下一步可测：
- **Gemini 2.0 Flash-Lite**：更轻量版本，可能 <5s
- **Gemini 1.5 Flash**：老版本但可能在某些场景更快

### 5.3 图片预处理优化

- 当前压缩参数：1280px / 500KB（DEC-040）
- 进一步优化：菜单场景可裁剪掉非文字区域（装饰图、餐厅 logo）后再上传
- 预计减少 30–40% 输入 token → VL 推理加速

---

## 六、架构决策速查

| 决策 | 内容 |
|------|------|
| DEC-028 | 所有 Bailian 调用必须 `enable_thinking: false` |
| DEC-044 | JSON 输出场景一律 `stream=false`（比 stream=true 快 2.4x） |
| DEC-045 | VL+Enrich 均换用 Gemini 2.0 Flash（绕开跨境路由） |
| **下一步** | **两阶段 SSE 推送：VL 完成即推 partial_result** |

---

*报告生成时间：2026-03-02*  
*下次更新：两阶段 SSE 方案实施后*
