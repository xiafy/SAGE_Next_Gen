# TASK: ExploreView 三个 Bug 修复

## Bug 1: 重复菜品

**现象**: "全部"分类下同一道菜出现两次（如"黄油煎鱼柳 / Lomo en Mantequilla"）
**根因**: AI 菜单识别可能返回重复菜品（同名不同 ID），或同一菜品被多个 category 引用
**修复**: 在 ExploreView 中对 filteredItems 做去重（基于 nameOriginal）

文件: `05_implementation/app/src/views/ExploreView.tsx`

在 filteredItems 计算之后，添加去重逻辑：
```typescript
// Deduplicate by nameOriginal (AI may generate duplicates with different IDs)
const seen = new Set<string>();
const deduped = filteredItems.filter((item) => {
  const key = item.nameOriginal.trim().toLowerCase();
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});
```
然后用 `deduped` 替代 `filteredItems` 渲染列表。

## Bug 2: +/- 按钮不响应

**现象**: 在 ExploreView 的菜品列表中，点击 +/- 按钮没有反应
**根因**: 如果重复菜品存在，用户可能操作的是重复项（ID 不同），导致 orderItems.find 找不到匹配。去重后应该解决。
**额外检查**: 确认 ExploreView 中的 dispatch type 字符串和 AppContext reducer 中的 case 完全一致（`UPDATE_ORDER_QTY`）。

如果去重后仍有问题，检查 `item.id` 是否正确传入 dispatch。

## Bug 3: 购物车图标替换

**现象**: 右上角 🛒 图标不美观，且"购物车"不符合餐饮场景
**修复**: 将所有 🛒 替换为更合适的图标

替换方案: 用 **🍽** (餐具) 或文字 badge 显示数量

在以下文件中替换：
- `05_implementation/app/src/views/ExploreView.tsx` — 右上角
- `05_implementation/app/src/views/AgentChatView.tsx` — 右上角

将 `🛒 {count}` 替换为一个更简洁的 badge 样式:
```tsx
<button
  onClick={() => dispatch({ type: 'NAV_TO', view: 'order' })}
  className="relative text-text-secondary hover:text-text-primary transition-colors text-sm"
  aria-label={isZh ? '查看点单' : 'View order'}
>
  🍽
  <span className="absolute -top-1 -right-2 bg-brand text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
    {count}
  </span>
</button>
```

---

## 编译验证

```bash
cd 05_implementation/app && npx tsc --noEmit && npx vite build
```

## Git Commit

`fix: explore dedup + order qty buttons + replace cart icon with dining icon`
