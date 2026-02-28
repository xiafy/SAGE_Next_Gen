# F11 菜品概要 + F12 饮食标签 — 执行计划

> 版本: v1.0 | 日期: 2026-07-23
> 关联规则: R011-01 ~ R011-03, R012-01 ~ R012-06
> 关联决策: DEC-037, DEC-039

---

## 总体策略

F11 和 F12 的数据都在 `/api/analyze` 阶段由 AI 一并生成（R011-03, R012-06），所以改动集中在三个点：

1. **shared/types.ts** — 扩展 MenuItem 数据结构
2. **Worker Prompt** — 让 AI 输出新字段
3. **前端 UI** — 菜品卡片展示概要+标签+联动

按依赖顺序分 4 个 Task，预计总工时 4-6 小时。

---

## Task 1: 数据结构扩展（shared/types.ts）

**关联规则**: R011-01, R011-02, R012-01, R012-03

**改动内容**:

```typescript
// 新增类型
export type AllergenType =
  | 'peanut' | 'shellfish' | 'gluten' | 'dairy'
  | 'egg' | 'soy' | 'tree_nut' | 'sesame';

export interface AllergenTag {
  type: AllergenType;
  uncertain: boolean;  // true = "可能含有"
}

export type DietaryFlag =
  | 'halal' | 'vegetarian' | 'vegan' | 'raw' | 'contains_alcohol';

// 扩展 MenuItem
export interface MenuItem {
  // ... 现有字段保持不变 ...
  brief: string;                    // 一句话概要（食材+味道）
  briefDetail?: string;             // 展开详情（类比+文化背景）
  allergens: AllergenTag[];         // 过敏原标签
  dietaryFlags: DietaryFlag[];      // 饮食标签
  spiceLevel: number;               // 辣度 0-5（0=未知/不辣）
  calories: number | null;          // 卡路里估算，null=无数据
}
```

**同步更新**:
- Worker 端 Zod schema 与 types.ts 对齐
- `VALID_TAGS` 常量保留（旧标签系统），新增 `VALID_ALLERGENS` 和 `VALID_DIETARY_FLAGS`

**验收**:
- `tsc --noEmit` 零错误（Level 1）
- `grep -q 'AllergenTag' shared/types.ts`（Level 2）
- `grep -q 'brief:' shared/types.ts`（Level 2）

**预计**: 30 分钟

---

## Task 2: Worker Prompt 工程（/api/analyze）

**关联规则**: R011-01, R011-03, R012-01, R012-02, R012-03, R012-06

**改动内容**:

1. 修改 analyze handler 的 System Prompt，要求 AI 对每道菜额外输出：
   - `brief`: 一句话（食材+味道），语言与 `context.language` 一致
   - `briefDetail`: 类比+文化背景（可选）
   - `allergens`: 过敏原数组，含 uncertain 标记
   - `dietaryFlags`: 饮食标签数组
   - `spiceLevel`: 0-5
   - `calories`: 估算值或 null

2. Prompt 中明确指令：
   - "菜单上已标注的饮食信息（如 V, GF, 🌶）优先采用，AI 可补充未标注维度"
   - "过敏原不确定时标 uncertain:true，宁可多标"
   - "brief 和 briefDetail 使用用户的 language 撰写"

3. 更新 Zod schema（宽容模式）：
   - `allergens`: `z.array(...).default([])`
   - `brief`: `z.string().default('')` → 后处理：空则用 nameTranslated 兜底
   - `calories`: `z.number().nullable().default(null)`
   - `spiceLevel`: `z.number().min(0).max(5).default(0)`

**验收**:
- curl 测试真实菜单图片，验证返回的 JSON 包含新字段（Level 3）
- 至少测 3 种菜单：中餐/泰餐/西餐
- brief 语言与 context.language 一致
- spicy 菜品 spiceLevel > 0

**预计**: 1.5-2 小时（Prompt 调优是主要时间）

---

## Task 3: 前端菜品卡片 UI

**关联规则**: R011-02, R012-04, R012-05

**改动内容**:

1. **菜品卡片组件**（探索视图 F07 + 对话推荐卡片 F06）：
   - 菜名下方显示 brief（一句话，灰色小字）
   - 点击展开 → 显示 briefDetail（如有）
   - 标签行：过敏原 pills + 饮食标签 pills + 辣度🌶 + 卡路里
   - 卡路里格式：`~XXX kcal`，calories 为 null 或 0 时隐藏

2. **过敏原与 F09 联动**：
   - 从 localStorage 读取用户 restrictions（type='allergy'）
   - 匹配 allergens → 标签变红底白字 + ⚠️
   - 匹配时卡片顶部加橙色警告条

3. **标签颜色方案**（与暖橙设计语言一致）：
   - 过敏原默认：浅灰底
   - 过敏原匹配用户设置：红底白字
   - 饮食标签：绿底（positive）/ 灰底（neutral）
   - 辣度：橙色系，级别越高越深
   - 卡路里：浅蓝底

**验收**:
- 视觉检查：标签紧凑不溢出（375px 屏宽）
- 展开/折叠动画流畅
- 设了过敏原偏好 → 高亮+警告条正确触发
- 未设偏好 → 无高亮无警告条
- calories=null → 无卡路里标签

**预计**: 2-3 小时

---

## Task 4: 端到端验证

**关联规则**: 全部

**内容**:

1. **Playwright E2E 补充**（2 个新 case）：
   - T6: 扫描菜单后菜品卡片显示 brief + 标签
   - T7: 设置过敏原偏好 → 菜品卡片高亮匹配的过敏原

2. **真机手动验证**：
   - 泰餐菜单：spiceLevel > 0、allergens 含 shellfish/peanut
   - 西餐菜单：calories 有值、gluten_free 标签
   - 中餐菜单：brief 中文正确

3. **规则表自动验证**：
   - 对 analyze API 返回的 JSON 逐条检查 R012-01 的标签完整性

**预计**: 1 小时

---

## 执行顺序与依赖

```
Task 1 (types.ts)
    ↓
Task 2 (Worker Prompt) ←── 可部署验证
    ↓
Task 3 (前端 UI)       ←── 可部署验证
    ↓
Task 4 (E2E)           ←── 最终验收
```

## 风险

| 风险 | 缓解 |
|------|------|
| AI 输出新字段不稳定 | Zod 宽容模式 + default 兜底 |
| Prompt 变长导致识别变慢 | 监控 processingMs，超 15s 则优化 Prompt |
| 旧标签系统(tags)与新系统(allergens+dietaryFlags)并存 | Task 1 保留旧 tags 不删，新系统独立新增，后续迁移 |

---

## Commit 规范

每个 Task 一次 commit：

```
feat(analyze): add dish brief and dietary tags to MenuItem

Rules: R011-01, R011-03, R012-01, R012-06
Boundaries-verified: empty brief fallback, calories null handling
Exceptions-handled: AI unable to infer → default values
```
