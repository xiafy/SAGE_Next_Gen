## F01 Home
- AC1: 🟡 部分通过（页面轻量，构建正常，但未见性能埋点或首屏交互耗时验证）
- AC2: ✅ 通过（`#root max-width: 430px`，主入口无滚动可见）
- AC3: ❌ 失败（未做系统语言自动检测，默认固定 `en`）
- AC4: ✅ 通过（设置按钮可进入 Settings）
问题：
- 🔴 缺失“动态问候语”（PRD 功能描述要求）
- 🟡 Home 出现“继续上次”，与“**不显示历史记录**”原则冲突（DEC-018）
建议：
- 启动时基于 `navigator.language` 初始化语言，并渲染时段问候语
- 移除 Home 的“继续上次”入口，历史上下文仅在对话内自然体现

## F02 Scanner
- AC1: 🟡 部分通过（进入 Scanner 快，但未实现“进入即相机激活”）
- AC2: ✅ 通过（JPG/PNG/HEIC 实际可走通，HEIC 转 JPEG）
- AC3: 🟡 部分通过（已限制最多 5 张并禁用按钮，但缺“超过时提示”）
- AC4: ✅ 通过（缩略图可展示、单张删除）
- AC5: ❌ 失败（无权限拒绝引导文案与专门分支）
- AC6: ❌ 失败（仅 HEIC 压缩，且目标 `maxSizeMB: 4`，未满足 `<2MB`）
- AC7: ✅ 通过（Path C 返回后对话历史在内存中保留）
问题：
- 🔴 主流程是“Scanner 内等待识别完成后再跳 Chat”，不符合“确认即跳 Chat，后台识别”
- 🟡 顶部返回固定回 Home，Path C 下用户预期应回 Chat
建议：
- 重构为：确认后立刻 `NAV_TO chat` + 后台 analyze；Scanner 仅负责采集
- 所有格式统一压缩目标 `<2MB`，并增加超限提示
- 增加权限 denied 说明与“继续从相册选择”显式引导

## F03 菜单识别
- AC1: ❌ 失败（Prompt 支持语言列表与 PRD 不一致：包含越南语/阿拉伯语，缺意大利语/德语）
- AC2: 🟡 未验证（无自动化准确率统计）
- AC3: 🟡 未验证（代码未约束 P90<10s，且 timeout=30s）
- AC4: ✅ 通过（Worker 端 `MenuAnalyzeResultSchema.safeParse` 严格校验）
- AC5: ❌ 失败（前端直接展示技术错误文本，如 `Menu analysis failed (502): ...`）
问题：
- 🔴 失败降级未按 PRD“用户可理解且引导重拍”，存在技术错误透出
建议：
- 对 error code 映射为 PRD 文案：模糊/不支持/网络异常 + 重试或重拍按钮
- 修正菜单识别 Prompt 的 9 语言白名单与 PRD一致

## F04 感知系统
- AC1: ✅ 通过（感知信息缺失时主流程可继续）
- AC2: ✅ 通过（当前没有 GPS 流程，因此不会弹提示）
- AC3: ❌ 失败（无 localStorage 持久化）
问题：
- 🔴 F04-B 未实现“进 App 立即请求 GPS（拒绝静默）”
- 🔴 F04-D 未实现跨 session 记忆
- 🟡 时间感知时段映射与 PRD 不完全一致（新增 14-17 下午茶分段）
建议：
- 在 App 启动层加入 geolocation 请求（catch 后静默）并注入 `context.location`
- 偏好与语言落盘 localStorage，启动时回填
- 按 PRD 时段映射统一 mealType 规则

## F06 AgentChat
- AC1: ❌ 失败（Path A 下实际不会进入 pre_chat，首条是 handoff 文案）
- AC2: 🟡 未验证（无 TTFT 指标采集）
- AC3: 🟡 部分通过（有 handoff 自动触发主 Chat，但无 P90 统计）
- AC4: 🟡 部分通过（主要依赖 prompt 约束，无程序级防重复兜底）
- AC5: ✅ 通过（quickReplies 来自 AI 返回）
- AC6: ✅ 通过（Explore 往返消息保留）
- AC7: ✅ 通过（网络中断时已有消息仍在本地 state）
问题：
- 🔴 与 DEC-027 冲突：未实现“先进入 AgentChat + Pre-Chat 多轮，再 handoff”
- 🟡 失败态与主消息区同时可见，状态表现混杂
建议：
- 把 analyze 异步化到 Chat 层，恢复 pre_chat -> handing_off -> chatting 状态机
- `failed` 阶段收敛 UI（隐藏输入区/推荐区），避免并行交互

## F07 探索视图
- AC1: ✅ 通过（Explore 内操作不丢 Chat 历史）
- AC2: ✅ 通过（分类来自 `menuData.categories`，非硬编码）
- AC3: ✅ 通过（返回 Chat 后自动滚动到底部）
问题：
- 🟡 功能描述中的“展开详情（食材/过敏原/文化注解）”未实现
建议：
- 增加 item 展开区与详情字段渲染（若 AI 无字段先做可空降级）

## F08 点餐单
- AC1: ✅ 通过（数量变化实时更新总价）
- AC2: ❌ 失败（展示模式字号 `text-2xl`≈24px，低于 28px 要求）
- AC3: ✅ 通过（展示模式仅原文菜名）
- AC4: ❌ 失败（未接入 `navigator.wakeLock` 及降级提示）
问题：
- 🔴 货币符号硬编码 `¥`，与“自动适配”不符
建议：
- 使用 `menuData.currency` 或 `Intl.NumberFormat` 做币种展示
- WaiterMode 字号提高至 >=28px 并接入 wake lock 生命周期管理

## F09 偏好管理
- AC1: ❌ 失败（偏好仅内存态，不跨 session）
- AC2: 🟡 未验证（自然提及依赖 prompt，缺评测）
- AC3: ❌ 失败（仅预置标签 toggle，缺“查看/删除/添加每条偏好”完整能力）
- AC4: 🟡 部分通过（有 `preferenceUpdates` 管道，但 reducer 仅处理 restriction，flavor/other 丢失）
问题：
- 🔴 自动学习结果未完整落库，且不能被设置页完整编辑
建议：
- 统一偏好数据结构（restriction/flavor/other）并持久化
- 设置页支持自由文本新增、单条删除、清空全部

## F10 语言切换
- AC1: ❌ 失败（无系统语言自动检测）
- AC2: ❌ 失败（大量文案硬编码中文，切英文后仍混杂）
- AC3: ❌ 失败（无持久化）
问题：
- 🔴 i18n 仅覆盖局部页面，未做到全局无遗漏
建议：
- 建立字典层（`zh/en`）并替换硬编码文案
- 启动时读取 `navigator.language` + localStorage 覆盖逻辑

## 前后端契约审计
问题：
- 🟡 `PreferenceUpdate` 前端类型不含 `other/strength`，与 worker schema 不完整对齐
- 🟢 Analyze 接口核心字段（`images[].data/mimeType`、`context`）已对齐
建议：
- 统一共享类型（可抽 `shared/` schema），减少漂移

## 错误处理与状态机审计
问题：
- 🔴 用户可见错误存在技术细节泄漏，不符合 PRD F03 失败降级体验
- 🟡 Path A 缺 pre_chat 阶段，状态机与 `ICEBREAKER_STATE_MACHINE.md` 不一致
建议：
- 统一错误码→用户文案映射层
- 恢复完整 pre_chat/handoff 状态流并补关键路径测试

## 业务哲学与决策一致性
- Goal > Process: 🟡 部分符合（对话主链存在，但 pre_chat 实际缺失）
- Scenario-Free: ✅ 符合（未见硬编码 persona 分支）
- Conversation-First: ✅ 基本符合（Chat 为核心）
- DEC-016/017/018/021/024/025/027 对齐度：🔴 低（F02/F04/F09/F10/F06 多项未落地）

## 文档一致性审计
问题：
- 🔴 `PROGRESS.md` 与 `EXECUTION_STATE.md` 标注“Phase4 完成、MVP 98%/Alpha完成”，与当前代码存在多项 PRD 核心 AC 未实现不一致
- 🟡 `EXECUTION_STATE.md` 自相矛盾：上文标记部署任务完成，下文“下一步”再次列出同任务为 ⏳
建议：
- 先按本报告修复 F02/F04/F06/F08/F09/F10 关键缺口，再回写进度状态
- 增加“PRD AC 覆盖率”字段，避免仅用构建通过判断完成
