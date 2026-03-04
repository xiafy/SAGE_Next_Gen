# F08 — 点餐单与展示模式 Spec

> 从 PRD F08 提取，Sprint 1 实现

## 概述

点餐单（Order）是用户的最终点菜决定，展示模式（Waiter Mode）是将点好的菜以大字原文展示给服务员的全屏界面。F08 还包含指点式沟通面板（DEC-060），实现服务员-用户跨语言餐桌沟通。

## 用户故事

- 作为用户，我在 Chat 中和 AI 商量好了菜品后，可以查看整理好的点菜清单，调整数量。
- 作为用户，我把手机递给服务员，屏幕大字显示原文菜名，服务员一看就懂。
- 作为用户，服务员说某道菜没有了，我可以通过沟通面板理解并快速决定换哪道。

## 交互流程

### 点餐单页面

```
[入口]
  ├─ Chat 页面浮动点餐单入口（有菜品时出现，显示数量+总价）
  └─ Chat 右上角点单 badge 图标
       ↓
[Order 页面]
  ├─ 菜品列表：菜名（翻译+原文）+ 数量 +/- + 小计
  │    ├─ 减到 0 即删除（不单独设删除按钮）
  │    └─ 长菜名：单行截断 + ellipsis
  ├─ 底部：总价 + 货币符号自适应（¥/$/€/฿）
  └─ 「展示给服务员」按钮 → Waiter Mode
```

### 展示给服务员模式（Waiter Mode）

```
[Waiter Mode]
  ├─ 全屏大字（≥ 28px），深色背景白字，屏幕常亮
  ├─ 顶部过敏/禁忌栏（若用户有声明，图标+英文+本地语言三重表达）
  ├─ 菜品列表：只显示原文菜名 + 数量（不显示翻译、不显示价格）
  ├─ 点击任意菜品 → 弹出指点式沟通面板
  └─ 底部双出口：
       ├─ 「继续点菜」→ 回到 Order
       └─ 「结束用餐」→ 二次确认 → 清空会话 → Home
```

### 指点式沟通面板（DEC-060）

```
[点击菜品]
  ↓
[底部弹出面板]
  ├─ 🚫 没有了 / Out of stock
  ├─ 🔄 换一道 / Change this
  ├─ ➕ 加一份 / One more
  └─ ❓ 其他 / Other
  （每个选项：用户语言 + 餐厅当地语言 双语显示）
```

### 导航规则

```
Order ← 返回 → Chat
Order → 展示给服务员 → Waiter
Waiter → 继续点菜 → Order
Waiter → 结束用餐 → 二次确认 → Home（清空全部状态）
```

## 数据模型

引用 `shared/types.ts`：
- `MenuItem`：菜品数据（`nameOriginal`、`nameTranslated`、`price`）
- `MealPlan` / `MealPlanItem`：AI 方案整套加入 Order 时使用
- `OrderAction` / `OrderActionType`：AI 在 Chat 中操作 Order 的指令
- `CommunicationAction`：`'sold_out' | 'change' | 'add_more' | 'other'`
- `CommunicationOption`：`{ action, icon, labelUser, labelLocal }`
- `AllergyBannerData`：`{ items: AllergyBannerItem[]; detectedLanguage: string }`
- `AllergyBannerItem`：`{ type, icon, labelEn, labelLocal }`

OrderItem（AppContext 中）：
```typescript
interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}
```

## 验收标准

- [ ] AC1: 数量变化时总价实时更新
- [ ] AC2: 展示模式字号 ≥ 28px，高对比（深色背景白字）
- [ ] AC3: 展示模式只显示原文菜名 + 数量，不显示翻译、不显示价格
- [ ] AC4: 展示模式屏幕常亮（navigator.wakeLock，不可用时降级提示）
- [ ] AC5: 「继续点菜」回到 Order，可继续回 Chat 加菜
- [ ] AC6: 「结束用餐」需二次确认（"这将清空本次所有点菜记录，确定吗？"），确认后清空 Order + 会话 → Home（DEC-057）
- [ ] AC7: 进入 Waiter Mode 时，若用户有声明过敏原/饮食禁忌，顶部显示过敏/禁忌栏（图标+英文+本地语言三重表达）
- [ ] AC8: Waiter Mode 下点击任意菜品弹出指点式沟通面板（双语），用于服务员-用户跨语言沟通（DEC-060）
- [ ] AC9: 进入 Waiter Mode 前，若 Order 含用户已知过敏原菜品，弹底部 sheet 提醒并要求确认（DEC-056）

## 边界情况

| 场景 | 处理 |
|------|------|
| Order 为空时进入 | 显示空状态引导，「继续点菜」按钮回到 Chat |
| 菜名极长（双语） | 单行截断 + ellipsis，避免撑破布局 |
| wakeLock 不支持 | 降级提示"请手动关闭自动锁屏" |
| 货币信息缺失 | 不显示货币符号，只显示数字 |
| 过敏原菜品确认后进入 Waiter | 正常进入，顶部过敏栏仍显示 |
| 「结束用餐」后返回 | 回到 Home，所有会话数据已清空 |

## 依赖

- F06（AgentChat）：Chat 是 Order 的入口和数据来源
- F07（Explore）：Explore 可直接进入 Waiter Mode（DEC-043）
- F09（偏好管理）：过敏原/禁忌数据来源
- F03（菜单识别）：`detectedLanguage` 用于本地语言翻译
- 详细 MealPlan/OrderAction 规格见 `specs/mealplan-and-order-spec.md`
- 详细 Waiter 升级规格见 `specs/waiter-upgrade-spec.md`
