# TASK: F11 菜品概要 + F12 饮食标签 — 前端 UI

## 必读文件（开始前 cat 以下文件）
- `shared/types.ts` — MenuItem 新增字段（brief/briefDetail/allergens/dietaryFlags/spiceLevel/calories）
- `app/src/views/ExploreView.tsx` — 当前菜品卡片渲染逻辑
- `app/src/views/AgentChatView.tsx` — 对话推荐卡片
- `app/src/hooks/useAppState.ts` — state 结构，含 preferences
- `specs/f11-f12-rules.yaml` — R011-02, R012-04, R012-05 规则

## 任务描述

### 1. 新建 `app/src/components/DishCard.tsx` — 菜品卡片组件

抽取 ExploreView 中的单个菜品卡片为独立组件，新增以下功能：

**F11 菜品概要**：
- 菜名下方显示 `brief`（灰色小字，单行）
- brief 下方有展开按钮（小三角或"详情"文字）
- 点击展开 → 显示 `briefDetail`（如有），带过渡动画
- briefDetail 为空/undefined 时不显示展开按钮
- 默认折叠

**F12 饮食标签行**（在 brief 下方，旧 tags 上方或替代旧 tags）：
- 过敏原标签 pills：每个 allergen 一个 pill
  - 默认：浅灰底深灰字
  - uncertain=true 时前缀 "⚠️"
  - 匹配用户过敏原偏好时：红底白字 + ⚠️ 图标（见下方联动逻辑）
- 饮食标签 pills：绿底（vegetarian/vegan/halal）、灰底（raw/contains_alcohol）
- 辣度：spiceLevel > 0 时显示 🌶 × spiceLevel（如 🌶🌶🌶）
- 卡路里：calories > 0 时显示 "~XXX kcal"（浅蓝底）
- calories 为 null 或 0 时不显示
- spiceLevel 为 0 时不显示辣度

**F09 过敏原联动**：
- 从 state.preferences.restrictions 中找 type='allergy' 的项
- 对比 allergen.type 与用户 restriction.value
- 匹配逻辑：用户 restriction.value 包含 allergen.type（如用户设了 "peanut"，菜品 allergen.type="peanut"）
- 匹配时：
  1. 该 allergen pill 变红底白字
  2. 卡片顶部增加橙色警告条：`⚠️ 可能含有您标记的过敏原：{allergen 中文名}`
- 不匹配时：正常显示

**标签中英文映射**（参考现有 TAG_LABELS 模式）：

```
allergen labels:
  peanut: 花生/Peanut
  shellfish: 甲壳类/Shellfish  
  gluten: 麸质/Gluten
  dairy: 乳制品/Dairy
  egg: 蛋/Egg
  soy: 大豆/Soy
  tree_nut: 坚果/Tree Nut
  sesame: 芝麻/Sesame

dietary labels:
  halal: 清真/Halal
  vegetarian: 素食/Vegetarian
  vegan: 纯素/Vegan
  raw: 生食/Raw
  contains_alcohol: 含酒精/Alcohol
```

**Props 接口**：
```typescript
interface DishCardProps {
  item: MenuItem;
  isZh: boolean;
  userAllergens: string[];  // 从 state.preferences.restrictions 提取的 allergy values
  orderItem?: OrderItem;    // 已点数量，用于 +/- 控件
  onAdd: () => void;
  onUpdateQty: (qty: number) => void;
}
```

### 2. 更新 `ExploreView.tsx`

- 用 `DishCard` 替换内联的菜品卡片渲染
- 从 state.preferences.restrictions 提取用户过敏原列表传给 DishCard
- 保留现有的分类筛选、去重、排序逻辑

### 3. 更新 `AgentChatView.tsx`

- 找到对话中的推荐卡片渲染处，同样使用 `DishCard` 组件
- 如果推荐卡片目前是简化版（只有菜名+价格+描述），升级为使用 DishCard

## 样式要求
- 使用现有设计系统的 CSS 变量（`--color-sage-*`）
- 标签 pill 用 rounded-full，文字 text-[10px]
- 警告条：bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-3 py-1.5 text-xs
- 展开动画：max-height transition + opacity，200ms ease

## 验收标准
- [ ] AC1: DishCard 组件存在且被 ExploreView 和 AgentChatView 引用
- [ ] AC2: brief 显示在菜名下方，briefDetail 点击可展开
- [ ] AC3: allergen/dietary pills 正确渲染
- [ ] AC4: 辣度和卡路里条件显示（0/null 时隐藏）
- [ ] AC5: 用户过敏原匹配时标签高亮+警告条
- [ ] AC6: `npx tsc --noEmit` 零错误
- [ ] AC7: `npm run build` 成功

## 禁止
- 不要修改 shared/types.ts 或 worker/ 目录
- 不要修改路由或导航逻辑

## 完成信号
完成后运行：openclaw system event --text "Done: F11+F12 DishCard UI with allergen highlighting" --mode now
