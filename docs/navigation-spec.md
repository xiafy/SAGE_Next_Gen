# SAGE Navigation Spec v2.0

> 上游决策: DEC-040（纯任务流导航）、DEC-057（导航状态机 6 条规则）、DEC-060（Waiter 沟通面板）
> 日期: 2026-03-02
> 状态: ✅ 当前基准版本

---

## 核心原则

**Order 是唯一执行数据源**（DEC-057）。Waiter Mode 只从 Order 读取数据，不存在绕过 Order 的路径。Explore 选菜无论走哪个出口都先写入 Order——用户点「➕ 加入」= "我要这道菜"，意图不因出口不同而改变。

---

## 页面清单（7 个）

| 页面 | 职责 |
|------|------|
| Home | 入口：开始新会话 / 继续上次 / 设置 |
| Scanner | 拍照/选图上传菜单 |
| Chat | AI 对话中枢（推荐、加菜、补拍入口；可通过 AI 直接操作 Order，DEC-058） |
| Explore | 浏览完整菜单列表（双出口均写入 Order） |
| Order | 点餐单汇总、增减数量（唯一执行数据源） |
| Waiter | 大字展示给服务员 + 指点式沟通面板（DEC-060） |
| Settings | 语言、偏好、关于 |

---

## 导航结构

```
Home ──→ Scanner ──→ Chat ←──→ Explore
  │         ↑          ↕           │
  ⚙        │        Order ◄───────┘ (Explore 两个出口都先写入 Order)
Settings    │          ↕
            │        Waiter (过敏原检查门控)
            │          ├→ 继续点菜 → Order
            │          ├→ 结束用餐 → 二次确认 → Home（清空）
            └──────────└→ 指点沟通 → 售罄/换菜/加份/其他
```

---

## 状态机 6 条规则（DEC-057）

| # | 规则 | 说明 |
|---|------|------|
| 1 | **Waiter 唯一数据源 = Order** | 无例外 |
| 2 | **Explore「展示给服务员」** | 已选菜品写入 Order → 过敏原检查 → Waiter |
| 3 | **Explore「咨询 AI」** | 已选菜品写入 Order → SelectedDishesCard 注入 Chat（DEC-053 v2） |
| 4 | **Waiter「继续点菜」** | → Order → 可继续回 Chat/Explore 加菜 |
| 5 | **Waiter「结束用餐」** | → 二次确认弹窗 → 清空 Order + 清空会话 → Home |
| 6 | **过敏原检查**（DEC-056） | 在 Order→Waiter 跳转时触发，无论来源路径 |

---

## 各页面导航规则

### Home
- **无会话时**：
  - 📷 扫描菜单 → Scanner
  - ⚙ 右上角设置 → Settings
- **有进行中会话时**（menuData 存在）：
  - 📷 继续上次用餐 → Chat
  - 🔄 新的一餐 → 清空会话 → Scanner
  - ⚙ 右上角设置 → Settings

### Scanner
- ← 返回：Home（首次进入） / Chat（补拍模式）
- → 确认分析：Chat

### Chat（中枢）
- ← 返回 Home：**需二次确认**（"退出会清空当前会话，确定吗？"）
- → 📋 浏览菜单：Explore
- → 🛒 点餐单（右上角 badge）：Order
- → 📷 补拍菜单：Scanner（补拍模式）
- **AI 可直接操作 Order**（DEC-058）：AI 回复末尾 JSON 代码块含 `orderAction` 时，前端自动执行 Order 修改

### Explore
- ← 返回：Chat
- **出口 A「展示给服务员」**：已选菜品 → 写入 Order → 过敏原检查 → Waiter
- **出口 B「咨询 AI」**：已选菜品 → 写入 Order → SelectedDishesCard 注入 Chat → 跳转 Chat

### Order
- ← 返回：Chat
- → 展示给服务员：**过敏原检查**（DEC-056）→ Waiter
- 可增减数量、删除菜品

### Waiter（DEC-060 指点式沟通面板）
- **过敏原/禁忌栏**：顶部醒目展示用户声明的过敏原和饮食禁忌（图标 + 英文 + 本地语言三重表达），仅在用户有声明时显示
- **菜品列表**：大字双语展示（原文 + 翻译），数据源 = Order
- **点击任意菜品** → 弹出沟通面板，选项（双语：用户语言 + `detectedLanguage`）：
  - 🚫 没有了 → 大字确认 → 从 Order 移除 → 提示是否需要 AI 推荐替代品
  - 🔄 换一道 → 大字询问服务员推荐 → 用户可进 Explore 或 Chat
  - ➕ 加一份 → Order 数量 +1
  - ❓ 其他问题 → 进入 Chat（携带菜品上下文）
- **继续点菜** → Order
- **结束用餐** → **二次确认弹窗**（"确定结束用餐吗？会清空当前点餐单"）→ 清空 Order + 清空会话 → Home

### Settings
- ← 关闭（✕）：Home

---

## 过敏原检查门控（DEC-056）

**触发时机**：任何路径从 Order → Waiter 的跳转。

**流程**：
1. 检查 Order 中菜品的 `allergenCodes` 是否命中用户已声明的过敏原
2. 命中 → 弹底部 sheet：列出风险菜品及对应过敏原
3. 用户选择「确认并继续」→ 进入 Waiter Mode
4. 用户选择「返回修改」→ 留在 Order
5. 确认后不再重复提醒
6. Waiter Mode 底部常驻 disclaimer："过敏原信息仅供参考，请向餐厅确认"

---

## 删除项

- ❌ BottomNav 组件及所有引用
- ❌ Settings 中的"开始新会话"按钮
- ❌ Home 的"随便聊聊"按钮

---

## 后续扩展

- 历史订单：Home 增加入口，Chat 会话持久化后实现
