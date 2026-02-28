# Spec — Core Loop S1 首次到店闭环

## 目标
让首次用户在 3 分钟内完成：拍菜单 → 得到建议 → 加入点单卡 → 切到服务员模式。

## 用户路径
Home → Scanner → AgentChat → OrderCard → WaiterMode → 返回 Chat

## 验收标准（AC）
- AC1: Scanner 选择 1-5 张后可稳定进入 Chat 并开始识别。
- AC2: 识别/分析阶段有清晰状态反馈，且与状态机一致。
- AC3: Chat 至少产出 2 条可执行建议（含理由）。
- AC4: 用户可把推荐加入 OrderCard，并可调数量。
- AC5: 可一键进入 WaiterMode 展示原文菜名。
- AC6: 从 WaiterMode 返回后，订单与对话状态不丢失。
- AC7: 任一步失败时有恢复路径（重试/补拍/继续聊天）。

## 非目标
- 不做付费墙
- 不新增复杂运营功能
