# F03 — 菜单识别（AI Vision）Spec

> 从 PRD F03 提取，Sprint 1 实现

## 概述

菜单识别是 SAGE 的核心 AI 能力，将用户拍摄的菜单图片转化为结构化的菜品数据。采用两阶段架构（DEC-042）：Step 1 OCR 提取菜品信息，Step 2 语义补全为每道菜补充描述和标签。识别过程中 AgentChat 不阻塞，同步进行 Pre-Chat 对话。

## 用户故事

- 作为用户，我拍完菜单后，AI 在几秒内就能识别出所有菜品并翻译，我不需要等待。
- 作为用户，如果图片模糊或语言不支持，我能得到友好的提示和重拍引导。

## 交互流程

```
[用户确认图片] → [跳转 AgentChat]
  ↓ （并行）
  ├─ 前台：Pre-Chat 对话开始（F06）
  └─ 后台：识别流程
       ↓
     Step 1 — OCR（qwen3-vl-flash，超时 20s）
       ├─ SSE 进度：vision_flash 阶段
       ├─ 输出：菜品名（原文+翻译）、价格、分类
       ↓
     Step 2 — 语义补全（qwen3.5-flash，超时 15s，best-effort）
       ├─ SSE 进度：validating 阶段
       ├─ 输出：brief、briefDetail、allergens、dietaryFlags、spiceLevel
       ├─ 失败不阻塞，降级为仅 OCR 结果
       ↓
     [completed] → 菜单数据注入 AgentChat（HANDING_OFF）
```

SSE 进度事件（`AnalyzeProgressEvent`）：
```
uploading → preparing → vision_flash → validating → completed
                                     ↘ enrich_error（Step 2 失败时）
```

## 数据模型

引用 `shared/types.ts`：
- `MenuData`：识别结果主体，包含 `menuType`、`detectedLanguage`、`priceLevel`、`currency`、`categories`、`items`
- `MenuItem`：单个菜品，包含 `nameOriginal`、`nameTranslated`、`price`、`brief`、`allergens`、`dietaryFlags`、`spiceLevel`
- `MenuCategory`：菜品分类，`itemIds` 引用 `MenuItem.id`
- `AnalyzeRequest`：请求体，含 `images[]`（1-5 张）和 `context`
- `AnalyzeProgressEvent`：SSE 进度事件，`stage` + `progress` + `message`
- `AnalyzeProgressStage`：`'uploading' | 'preparing' | 'vision_flash' | 'vision_plus_fallback' | 'validating' | 'enrich_error' | 'completed'`

输出 JSON 经 Zod schema 校验：
```typescript
// Worker 端校验
const result = MenuDataSchema.safeParse(aiOutput);
if (!result.success) {
  // 降级处理：尝试修复或返回部分结果
}
```

## 验收标准

- [ ] AC1: 支持语言：中 / 英 / 日 / 韩 / 泰 / 法 / 西班牙 / 意大利 / 德语
- [ ] AC2: 标准印刷菜单识别成功率 ≥ 90%
- [ ] AC3: 识别时间 < 10 秒（P90，正常网络）
- [ ] AC4: 所有 AI 返回数据经 Zod schema 校验，校验失败时有降级处理
- [ ] AC5: 失败提示引导用户重新拍摄，不出现技术错误信息

## 边界情况

| 场景 | 处理 |
|------|------|
| 图片模糊 | 提示"图片有点模糊，建议重新拍一张，光线好一点更准"+ 「重新拍摄」按钮 |
| 语言暂不支持 | 提示"这个语言我暂时识别不好，建议换张更清晰的图或换个角度" |
| 网络/API 异常 | 提示"网络好像有点问题，稍后再试试"+ 「重试」按钮 |
| Step 2 语义补全失败 | 不阻塞，使用 Step 1 结果（brief 等字段为空） |
| 多张图片有重复菜品 | 按类别整合，重复菜品去重（原文菜名+价格为 key） |
| Zod 校验失败 | 降级处理：尝试 partial parse，保留有效字段 |
| 不引导手动输入 | 菜单识别失败时，只提供重拍选项，不引导用户手动输入菜单 |

## 依赖

- F02（Scanner）：提供图片数据
- F06（AgentChat）：识别结果 HANDING_OFF 到主 Chat
- F04（感知数据）：context 中的 language、location、timestamp
