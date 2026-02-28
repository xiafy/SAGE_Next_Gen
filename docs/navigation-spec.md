# SAGE Navigation Spec v1.0

> DEC-040: 去掉 BottomNav，改为纯任务流导航（B+C 方案）

## 页面清单（7 个，不变）

| 页面 | 职责 |
|------|------|
| Home | 入口：开始新会话 / 继续上次 / 设置 |
| Scanner | 拍照/选图上传菜单 |
| Chat | AI 对话中枢（推荐、加菜、补拍入口） |
| Explore | 浏览完整菜单列表 |
| Order | 点餐单汇总、增减数量 |
| Waiter | 大字展示给服务员 |
| Settings | 语言、偏好、关于 |

## 导航结构

```
Home ──→ Scanner ──→ Chat ←──→ Explore
  │         ↑          ↕
  ⚙        │        Order ←──→ Waiter
Settings    │                    ├→ 继续点菜 → Order
            └────────────────────└→ 结束用餐 → Home（清空）
```

Chat 是中枢，所有操作从 Chat 出发、回到 Chat。

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

### Explore
- ← 返回：Chat
- 加菜操作在本页完成，不跳转

### Order
- ← 返回：Chat
- → 展示给服务员：Waiter
- 可增减数量、删除菜品

### Waiter
- **继续点菜** → Order
- **结束用餐** → 清空会话 → Home

### Settings
- ← 关闭（✕）：Home
- 不再有"开始新会话"按钮（由 Waiter 和 Home 承担）

## 删除项

- ❌ BottomNav 组件及所有引用
- ❌ Settings 中的"开始新会话"按钮（可选保留为兜底）
- ❌ Home 的"随便聊聊"按钮（功能未实现，移除避免困惑）

## 后续扩展

- 历史订单：Home 增加入口，Chat 会话持久化后实现
