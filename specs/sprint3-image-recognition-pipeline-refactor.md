# Sprint 3 Spec — 图片识别链路（已完成部分）

> 版本: v2.0（2026-03-02）
> 状态: ✅ 核心功能已完成并部署
> 旧版（v1.0，2026-03-01）已归档至 `archive/sprint3-pipeline-refactor-v1-archived.md`

---

## 已完成（生产中）

### 传输层（DEC-041）
- ✅ 前端 `multipart/form-data` 二进制上传（替代 base64 JSON）
- ✅ Worker SSE 响应：`progress` 事件 + `result` 事件
- ✅ 旧 JSON 请求兼容路径保留

### 图片压缩（DEC-040）
- ✅ `maxDimension=1280px`、`maxSizeBytes=500KB`
- ✅ `createImageBitmap` 主路径，`new Image()` 兜底
- ✅ 压缩并发限制 ≤2（iPhone Safari 内存优化）

### 两阶段 Pipeline（DEC-042、DEC-045）
- ✅ Stage 1（VL）：`gemini-2.0-flash`，OCR + allergenCodes 提取，timeout=35s
- ✅ Stage 2（Enrich）：`gemini-2.0-flash`，brief/allergens/spiceLevel 补全，timeout=25s
- ✅ stream=false for JSON outputs（DEC-044）

### Prompt v8（DEC-050）
- ✅ VL 提取 `allergenCodes`（EU 括号编号）
- ✅ Enrich 内置 EU 1-11 过敏原编号对照表
- ✅ allergens 双来源：编号转换 + 知识推断（uncertain 标记）
- ✅ maxOutputTokens=8192（大菜单不截断）

### 地理兜底（DEC-051）
- ✅ Gemini `FAILED_PRECONDITION` → 自动切百炼新加坡
- ✅ VL 兜底：`qwen-vl-plus`（dashscope-intl）
- ✅ Enrich 兜底：`qwen-plus-latest`（dashscope-intl）
- ✅ `useBailian` 标志在两阶段共享

### 生产指标（2026-03-02 实测）
| 指标 | 数值 |
|------|------|
| 总端到端延迟 | ~19.3s |
| Allergen Recall | 100%（26/26）|
| Allergen Precision | 93% |
| VL 耗时 | ~9.7s |
| Enrich 耗时 | ~9.6s |

---

## Backlog（已记录，暂缓实现）

### BACKLOG-001：Two-stage SSE（DEC-046）
- 目标：VL 完成（~8s）即推送 `partial_result`，用户先看菜单，Enrich 后台静默更新
- 预期感知延迟：19s → ~8s
- 状态：已批准，待排期

### BACKLOG-002：Enrich 分批（BACKLOG-001 in DECISIONS.md）
- 触发条件：菜单 >60 道菜时 JSON 超出 8192 tokens
- 方案：按 35 道一组分批 Enrich 后合并
- 状态：已记录，待触发时实施

---

## 验收标准（当前已通过）
- ✅ Path A / Path C 均正常 SSE 进度 + 最终结果
- ✅ `tsc --noEmit` 前后端全绿
- ✅ `pnpm build` 成功
- ✅ Allergen recall ≥ 70%（实测 100%）
- ✅ 生产 Worker 无报错（geo-block 已兜底）
