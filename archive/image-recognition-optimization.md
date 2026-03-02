# 图片识别效率与质量——系统性优化方案

> 日期: 2026-03-01 | 状态: 待评审
> 优先级: P0（产品成败关键）

---

## 一、现状诊断

### 端到端链路

```
iPhone 拍照 (12MP, ~3-5MB HEIC)
  ↓ 客户端压缩 (canvas resize → JPEG)
  ↓ 1024px, ≤400KB, quality 0.75→0.3 降级
  ↓ base64 编码 (+33% 体积)
  ↓ JSON POST body
  ↓ ──── 网络 ──────────────────────
  ↓ CF Worker (Tokyo) 接收
  ↓ Zod schema 校验
  ↓ DashScope API 调用 (streamAggregate)
  ↓   qwen3-vl-flash (timeout 30s)
  ↓   ↓ 失败 → qwen3-vl-plus (timeout 60s)
  ↓   ↓ 失败 → qwen3-vl-flash 最后重试 (timeout 30s)
  ↓ JSON 解析 + Zod 校验
  ↓   ↓ 解析失败 → qwen3-vl-plus 重试 (timeout 60s)
  ↓ ──── 网络 ──────────────────────
  ↓ 客户端接收完整 JSON
手机显示菜单
```

### 实测数据（2026-03-01，从 Mac → DashScope 直连）

| 图片大小 | Base64 | TTFB | 总耗时 | Prompt Tokens |
|---------|--------|------|--------|--------------|
| 98KB    | 131KB  | —    | 0.8s   | 810          |
| 196KB   | 261KB  | —    | 0.8s   | 810          |
| 311KB   | 415KB  | —    | 1.4s   | 810          |
| 43KB (含中泰文菜单) | 58KB | 2.1s | 6.1s | — |

### 关键瓶颈

| 环节 | 耗时 | 可优化空间 |
|------|------|-----------|
| 📱 客户端压缩 | ~200-500ms | 低（已接近极限） |
| 📡 上传到 CF Worker | ~200-1000ms | 中（取决于图片大小和网络） |
| 🤖 DashScope VL 处理 | **2-15s** | **高（主瓶颈）** |
| 📥 DashScope 流式输出 | 3-8s | 中（取决于输出 token 数） |
| ⏱ 超时降级链 | 0-90s（最坏） | **高（当前设计有缺陷）** |

### 已知问题

1. **streamAggregate 模式**：Worker 等待 DashScope 所有 token 返回后才响应客户端。用户从按下拍照到看到结果，全程无中间反馈（除前端进度条动画）。
2. **降级链太长**：flash 30s 超时 → plus 60s 超时 → flash 30s 重试 → plus 60s 重试 = 理论最长 180s，但客户端 65s 就断了。
3. **DashScope 不稳定**：高峰期延迟波动大，30s timeout 可能刚好不够。
4. **Base64 膨胀**：400KB JPEG → 533KB base64，在弱网下额外 +1-2s。

---

## 二、优化方案（按 ROI 排序）

### 方案 A：优化超时与降级策略 ⚡ 立即可做

**问题**：当前 flash 30s 超时太短，DashScope 偶尔慢但不是不可用。

**方案**：
```
改前: flash(30s) → plus(60s) → flash(30s) → [解析失败] → plus(60s)
改后: flash(45s) → [解析失败] → plus(50s) → done
```

- flash 超时从 30s → 45s（给 DashScope 更多时间）
- 去掉三层降级，简化为：flash → 失败仅 plus 重试一次
- 客户端超时 65s → 70s
- 减少降级触发概率 + 缩短最坏情况时间

**预估收益**：超时失败率降低 50%+

---

### 方案 B：流式进度反馈 ⚡ 1-2h 工作量

**问题**：用户等 10-15s 不知道发生了什么，体感很慢。

**方案**：Worker → 客户端改为 SSE 流式，实时推送阶段状态：
```
event: phase
data: {"phase": "uploading"}     // Worker 收到请求

event: phase
data: {"phase": "analyzing"}     // DashScope 开始处理

event: phase  
data: {"phase": "parsing", "itemCount": 12}  // 已识别到 12 道菜

event: result
data: {完整 MenuData JSON}       // 最终结果
```

前端进度条从"假动画"变为"真实进度"。

**预估收益**：体感等待时间减少 40%（心理层面）

---

### 方案 C：图片二进制上传 🔧 2-3h 工作量

**问题**：Base64 膨胀 33%，JSON body 对大图不友好。

**方案**：改用 `multipart/form-data` 上传：
```
POST /api/analyze
Content-Type: multipart/form-data

file[0]: image.jpg (binary)
file[1]: image2.jpg (binary)  
context: {"language":"zh","timestamp":...}
```

**预估收益**：
- 上传体积减少 25%
- 弱网环境下节省 0.5-2s
- Worker 内存压力降低

---

### 方案 D：Prompt 瘦身 🔧 1h 工作量

**问题**：菜单分析 system prompt 可能过长，增加 prompt token 和处理时间。

**方案**：
- 审计当前 prompt token 数
- 精简无效指令（VL 模型比文本模型更依赖视觉，文字指令可以更短）
- 减少输出 schema 复杂度（MVP 只需 name + price + category）

**预估收益**：prompt tokens 减少 → TTFB 降低 0.5-1s

---

### 方案 E：WebP 替代 JPEG 🔧 30min

**问题**：JPEG 在同等画质下文件更大。

**方案**：优先使用 `image/webp` 编码（iOS 14+ Safari 支持）：
```typescript
const mimeType = canvas.toBlob && 'image/webp'; // check support
// WebP at q=0.75 ≈ JPEG at q=0.85, but 25-35% smaller
```

**预估收益**：同画质下图片体积减少 25-35%

---

### 方案 F：预判式加载（长期） 🔭 探索

**问题**：用户拍完照要等完整识别才能开始对话。

**方案**：
- 拍照后立即开始压缩+上传（已做）
- 菜单识别结果分段返回：先返回"检测到 N 道菜"，再逐步完善详情
- Pre-chat 阶段的对话不依赖完整菜单数据

**预估收益**：用户感知的"等待开始"时间从 10-15s → 3-5s

---

## 三、推荐执行顺序

| 优先级 | 方案 | 工作量 | 收益 |
|--------|------|--------|------|
| **P0** | A. 超时策略优化 | 30min | 超时失败率降低 50%+ |
| **P0** | D. Prompt 瘦身 | 1h | TTFB 减少 0.5-1s |
| **P1** | E. WebP 编码 | 30min | 上传体积减少 25-35% |
| **P1** | B. 流式进度反馈 | 2h | 体感等待减少 40% |
| **P2** | C. 二进制上传 | 3h | 上传减少 25%，弱网优化 |
| **P3** | F. 预判式加载 | 探索 | 感知等待 3-5s |

---

## 四、质量维度

图片识别质量取决于：
1. **图片清晰度**：1024px 对大多数菜单足够（文字可辨认）
2. **模型能力**：qwen3-vl-flash 在标准菜单上表现好，手写/艺术字体需 plus
3. **Prompt 引导**：结构化输出指令的准确性
4. **校验兜底**：Zod schema + 解析失败重试 + 前端孤儿 item 处理

当前质量问题主要不在识别精度，而在**稳定性和速度**。优先解决超时和体验问题。

---

## 五、监控建议（后续）

- Worker 打点：每次 analyze 记录 `{imageCount, totalBytes, model, ttfb, totalMs, success}`
- 前端打点：每次 analyze 记录 `{compressMs, uploadMs, totalMs, retryCount, success}`
- 定期分析 P50/P95/P99 耗时，及时发现 DashScope 服务波动
