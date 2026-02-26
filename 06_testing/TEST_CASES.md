# TEST_CASES.md — 详细测试用例

> 版本: v1.0
> 日期: 2026-02-26
> 状态: ✅ 完整版（L1 单元 / L2 组件 / L3 集成 / L4 E2E / L5 真机）
> 上游文档: `TEST_PLAN.md`、`PRD.md v1.3`、`API_DESIGN.md v1.0`
> 原则: 场景驱动 + 破坏性思维 + 边界优先

---

## 用例格式说明

```
TC-{层级}{编号}: {用例标题}
前置条件: ...
输入: ...
操作步骤: ...
期望结果: ...
优先级: P0（阻塞）/ P1（高）/ P2（中）
Sprint: 需要在哪个 Sprint 执行
```

---

## L1 — 单元测试（Vitest）

> 目标: 工具函数、数据处理、Schema 校验

---

### TC-L101: mergeMenus — 合并两页菜单，去重

```
前置条件: 两个 AnalyzeResponseData 对象（第一页含 10 道菜，第二页含 8 道菜，其中 3 道菜名重复）
输入: mergeMenus(menu1, menu2)
期望结果:
  - 合并后 items 数量 = 15（10 + 8 - 3）
  - 重复菜品只保留一条
  - categories 合并，同名分类合并为一个
  - 所有 item.id 唯一
优先级: P0
Sprint: Sprint 1
```

### TC-L102: mergeMenus — 合并 5 页菜单不丢失任何菜品

```
前置条件: 5 个独立分类的菜单页面（无重复菜品，共 50 道菜）
输入: mergeMenus(m1, m2, m3, m4, m5)
期望结果:
  - 合并后 items.length === 50
  - 合并后 categories 正确聚合
  - 无 items 丢失
优先级: P0
Sprint: Sprint 1
```

### TC-L103: mergeMenus — 单页菜单输入，返回原样

```
输入: mergeMenus(singleMenu)
期望结果: 返回值与输入等价（深比较）
优先级: P1
Sprint: Sprint 1
```

### TC-L104: currency — 货币符号识别

```
输入/期望:
  "¥1,200"    → { symbol: "¥", amount: 1200, raw: "¥1,200" }
  "$12.99"    → { symbol: "$", amount: 12.99, raw: "$12.99" }
  "฿350"      → { symbol: "฿", amount: 350, raw: "฿350" }
  "€8,50"     → { symbol: "€", amount: 8.50, raw: "€8,50" }
  "无价格"     → null
优先级: P1
Sprint: Sprint 1
```

### TC-L105: AnalyzeResponseSchema — 合法数据通过

```
输入: 完整合法的 AnalyzeResponse 对象
期望结果: Zod parse 成功，无抛出
优先级: P0
Sprint: Sprint 1
```

### TC-L106: AnalyzeResponseSchema — 缺少必填字段

```
输入: 缺少 items 字段的 AnalyzeResponse
期望结果: Zod parse 抛出 ZodError，错误路径包含 "items"
优先级: P0
Sprint: Sprint 1
```

### TC-L107: AnalyzeResponseSchema — tags 包含非法值

```
输入: items[0].tags = ["spicy", "unknown_tag"]
期望结果: Zod parse 抛出 ZodError（unknown_tag 不在枚举内）
优先级: P1
Sprint: Sprint 1
```

### TC-L108: ChatResponseSchema — quickReplies 数量超限

```
输入: quickReplies = ["a", "b", "c", "d", "e"]（5 个，最大 4）
期望结果: Zod parse 抛出 ZodError
优先级: P1
Sprint: Sprint 1
```

### TC-L109: PreferencesContext — FIFO 淘汰（history 超 50 条）

```
输入: 向 history 写入第 51 条记录
期望结果:
  - history.length 保持 50
  - 最旧的记录（index 0）被移除
  - 新记录在 index 49
优先级: P1
Sprint: Sprint 1
```

### TC-L110: getMealType — 根据时间判断餐型

```
输入/期望:
  06:00–10:30 → "breakfast"
  11:00–14:00 → "lunch"
  14:01–17:00 → "afternoon_tea"
  17:01–21:00 → "dinner"
  21:01–23:59 → "late_night"
  00:00–05:59 → "late_night"
优先级: P1
Sprint: Sprint 1
```

### TC-L111: useWakeLock — 请求锁定，进入 WaiterMode

```
前置条件: 模拟 navigator.wakeLock.request 成功
输入: 调用 requestWakeLock()
期望结果: wakeLock 对象存在，isWakeLockActive = true
优先级: P2
Sprint: Sprint 1
```

### TC-L112: useWakeLock — 释放 WakeLock，离开 WaiterMode

```
前置条件: wakeLock 已锁定
输入: 调用 releaseWakeLock()
期望结果: wakeLock.release() 被调用，isWakeLockActive = false
优先级: P2
Sprint: Sprint 1
```

---

## L2 — 组件测试（Vitest + RTL）

> 目标: 核心 UI 组件行为

---

### TC-L201: MessageBubble — 渲染用户消息

```
输入: <MessageBubble role="user" content="我不吃辣" />
期望结果:
  - 消息内容正确显示
  - 有 role="user" 对应的样式（右对齐、浅色气泡）
  - 无 "assistant" 相关样式
优先级: P0
Sprint: Sprint 1
```

### TC-L202: MessageBubble — 渲染 AI 消息（含推荐卡片）

```
输入: <MessageBubble role="assistant" content="推荐你试试..." recommendations={[...]} />
期望结果:
  - 文本内容正确
  - DishCard 组件被渲染（数量 = recommendations.length）
  - DishCard 中菜名正确显示
优先级: P0
Sprint: Sprint 1
```

### TC-L203: MessageBubble — AI 消息的 XSS 防御

```
输入: content = '<script>alert("xss")</script>恶意内容'
期望结果:
  - 页面渲染为纯文本，不执行 script
  - 显示转义后的 &lt;script&gt; 字符（或直接纯文本）
优先级: P0
Sprint: Sprint 1
```

### TC-L204: DishCard — 点击「加入」按钮

```
前置条件: 菜品未加入点餐单
输入: 点击 <DishCard item={dish} /> 的「加入」按钮
期望结果:
  - onAdd 回调被调用，参数为该菜品
  - 按钮变为「已加入」状态（禁用或改变样式）
优先级: P0
Sprint: Sprint 1
```

### TC-L205: DishCard — 已加入状态不可重复添加

```
前置条件: 菜品已在 orderedItems 中
输入: 渲染 DishCard，isOrdered=true
期望结果:
  - 按钮显示「已加入」
  - 按钮不可点击（disabled）
优先级: P1
Sprint: Sprint 1
```

### TC-L206: QuickReply — 渲染快捷回复按钮组

```
输入: <QuickReply options={["不辣", "素食", "推荐今日特供"]} onSelect={fn} />
期望结果:
  - 渲染 3 个按钮
  - 按钮文字正确
优先级: P1
Sprint: Sprint 1
```

### TC-L207: QuickReply — 点击后按钮组消失

```
输入: 点击任意快捷回复按钮
期望结果:
  - onSelect 被调用，参数为按钮文字
  - 整个 QuickReply 组件从 DOM 移除（只能点一次）
优先级: P1
Sprint: Sprint 1
```

### TC-L208: ImagePreviewBar — 渲染图片缩略图

```
输入: <ImagePreviewBar images={[img1, img2, img3]} onRemove={fn} />
期望结果:
  - 3 个缩略图正确渲染
  - 每个缩略图有删除按钮（❌）
优先级: P1
Sprint: Sprint 1
```

### TC-L209: ImagePreviewBar — 删除一张图片

```
前置条件: 3 张图片已预览
输入: 点击第 2 张图片的删除按钮
期望结果:
  - onRemove 被调用，参数为 index=1
  - 渲染更新为 2 张缩略图
优先级: P1
Sprint: Sprint 1
```

### TC-L210: OrderBar — 底部浮动入口显示正确数量

```
输入: orderedItems = [item1, item2, item3]
期望结果:
  - 显示「3 道菜」（或对应 badge）
  - 点击触发导航到 ORDER_CARD 视图
优先级: P0
Sprint: Sprint 1
```

### TC-L211: LoadingDots — AI 思考中动画

```
输入: <LoadingDots />
期望结果:
  - 渲染 3 个动画点
  - 有 aria-label="正在思考"（无障碍）
优先级: P2
Sprint: Sprint 1
```

---

## L3 — 集成测试（Vitest + MSW）

> 目标: API 调用链路、AI 数据处理流程

---

### TC-L301: analyzeMenu — 正常流程

```
前置条件: MSW 拦截 /api/analyze，返回合法 AnalyzeResponse fixture
输入: analyzeMenu({ images: [img1], language: 'zh' })
期望结果:
  - 函数返回 AnalyzeResponseData（Zod 校验通过）
  - menuType、items、categories 字段存在
优先级: P0
Sprint: Sprint 1
```

### TC-L302: analyzeMenu — AI_TIMEOUT 错误处理

```
前置条件: MSW 返回 504 + { error: { code: "AI_TIMEOUT", retryable: true } }
输入: analyzeMenu(...)
期望结果:
  - 抛出 SageApiError
  - error.code === "AI_TIMEOUT"
  - error.retryable === true
优先级: P0
Sprint: Sprint 1
```

### TC-L303: analyzeMenu — Zod 校验失败（AI 返回格式错误）

```
前置条件: MSW 返回 200 但 data 字段结构非法（items 字段缺失）
输入: analyzeMenu(...)
期望结果: 抛出 ZodError（非 SageApiError）
优先级: P0
Sprint: Sprint 1
```

### TC-L304: analyzeMenu — 前端超时（30s）

```
前置条件: MSW 延迟 31s 响应
输入: analyzeMenu(...)
期望结果:
  - AbortController 触发
  - 抛出 AbortError（或包装后的超时错误）
  - 不无限等待
优先级: P0
Sprint: Sprint 1
```

### TC-L305: sendChatMessage — 正常流程

```
前置条件: MSW 返回合法 ChatResponse fixture
输入: sendChatMessage({ messages: [...], menuData, preferences, context })
期望结果:
  - 返回 ChatResponseData（Zod 校验通过）
  - message、quickReplies、recommendations 字段存在
优先级: P0
Sprint: Sprint 1
```

### TC-L306: sendChatMessage — messages 超 50 条时前端自动裁剪

```
前置条件: 构造 55 条对话历史
输入: sendChatMessage({ messages: 55条历史 + 1条新消息, ... })
期望结果:
  - 实际发送的 messages.length <= 50
  - 最新消息（用户消息）保留在最后
  - 最早的消息被 FIFO 移除
优先级: P1
Sprint: Sprint 1
```

### TC-L307: 速率限制触发后前端正确处理

```
前置条件: MSW 返回 429 + Retry-After: 60
输入: analyzeMenu(...)
期望结果:
  - 抛出 SageApiError，code = "RATE_LIMIT_EXCEEDED"
  - 前端展示倒计时提示（"请 60 秒后重试"）
优先级: P1
Sprint: Sprint 1
```

### TC-L308: AppContext — 菜单识别完成后状态更新

```
前置条件: MSW 正常返回，AppContext 初始 menuData = null
输入: 触发 ANALYZE_SUCCESS action
期望结果:
  - AppState.menuData 更新为返回数据
  - AppState.isAnalyzing = false
  - AppState.view 保持 'agent_chat'
优先级: P0
Sprint: Sprint 1
```

### TC-L309: PreferencesContext — AI 返回 preferenceUpdates 后 localStorage 同步

```
前置条件: MSW 返回 preferenceUpdates = [{type:'restriction', action:'add', value:'花生'}]
输入: 前端处理 ChatResponse
期望结果:
  - PreferencesState.restrictions 新增 {type:'allergy', value:'花生'}
  - localStorage['sage_preferences'] 更新
  - 下次 sendChatMessage 时 preferences 包含新记录
优先级: P1
Sprint: Sprint 1
```

---

## L4 — E2E 测试（Playwright）

> 目标: 核心用户旅程 + 边界场景
> Mock: 所有 /api/* 请求通过 Playwright route 拦截，使用 fixture 数据

---

### TC-L401: Path A 完整旅程（Happy Path）

```
场景: 用户扫菜单 → AI 识别 → 对话 → 点餐
步骤:
  1. 打开 / (HomeView)
  2. 点击「扫描菜单」按钮
  3. 在 ImagePicker 选择 1 张日文菜单图片（fixture）
  4. 确认，跳转 AgentChatView
  5. 验证 Icebreaker 消息出现（"菜单识别中…"）
  6. /api/analyze 返回（fixture：日文居酒屋菜单）
  7. 验证 AI 开场白出现（含问候）
  8. 点击快捷回复「推荐招牌菜」
  9. /api/chat 返回（含 3 个 recommendations）
  10. 验证 DishCard 渲染（3 张）
  11. 点击第 1 张 DishCard「加入」
  12. 验证底部 OrderBar 显示「1 道菜」
  13. 点击 OrderBar → 跳转 OrderCardView
  14. 验证菜品显示正确
  15. 点击「展示给服务员」→ WaiterMode
  16. 验证全屏显示原文菜名（日文）

期望结果: 全程无错误，每步断言通过
优先级: P0（阻塞 Sprint 1 完成）
Sprint: Sprint 1
```

### TC-L402: GPS 权限拒绝 → 静默跳过（DEC-021）

```
步骤:
  1. 模拟 navigator.geolocation.getCurrentPosition 调用 error 回调
  2. 完成完整 Path A 流程
期望结果:
  - 无任何 GPS 相关弹窗或提示
  - context.location 字段不传给 API（或传 undefined）
  - 流程正常继续
优先级: P0
Sprint: Sprint 1
```

### TC-L403: Path C — 对话中补充菜单

```
步骤:
  1. 完成第一页菜单识别（10 道菜）
  2. 在 AgentChatView 点击「补充菜单」入口（图标/按钮）
  3. 上传第二页菜单图片
  4. /api/analyze 返回第二页数据（8 道菜，2 道重复）
  5. 验证菜单合并后 items = 16（10+8-2）
  6. 继续对话，AI 能推荐新页面的菜品
期望结果: 菜单合并正确，对话历史保留
优先级: P0
Sprint: Sprint 1
```

### TC-L404: AI 超时 → 显示重试提示

```
步骤:
  1. /api/analyze 模拟 504 AI_TIMEOUT 响应
  2. 观察 AgentChatView
期望结果:
  - 错误消息出现（"识别超时，请重试"）
  - 提供「重试」按钮
  - 点击重试 → 重新触发 /api/analyze
优先级: P0
Sprint: Sprint 1
```

### TC-L405: 探索视图 → 返回对话，历史不丢失（DEC-022）

```
步骤:
  1. 完成菜单识别，进入对话，已有 5 条消息
  2. 点击「浏览全部菜单」→ 跳转 ExploreView
  3. 浏览 ExploreView
  4. 点击返回 → 回到 AgentChatView
期望结果:
  - 5 条消息历史完整保留
  - 菜单数据不丢失
  - 滚动位置恢复到对话底部
优先级: P0
Sprint: Sprint 1
```

### TC-L406: 偏好设置 — 设置饮食限制后 AI 推荐排除

```
步骤:
  1. 进入设置页，添加限制「花生过敏」
  2. 扫描含有花生菜品的菜单（fixture）
  3. 发送「随便推荐」消息
  4. 验证 /api/chat 请求体中 preferences.restrictions 含「花生过敏」
  5. Mock AI 返回排除花生菜品的推荐
  6. 验证 DishCard 中无花生菜品
期望结果: 偏好正确传递，推荐合理
优先级: P1
Sprint: Sprint 2
```

### TC-L407: 语言切换 → UI 同步更新（DEC-025）

```
步骤:
  1. 系统语言为中文，App 初始显示中文 UI
  2. 进入设置页，切换语言为 English
  3. 返回 HomeView
期望结果:
  - 所有 UI 文本切换为英文（"Scan Menu" 等）
  - 下次 API 调用 context.language = "en"
  - localStorage language 字段更新为 "en"
优先级: P1
Sprint: Sprint 2
```

### TC-L408: WaiterMode 展示原文（DEC-015）

```
步骤:
  1. 完成日文菜单识别
  2. 加入「刺身盛合わせ」（日文原名）
  3. 进入 WaiterMode
期望结果:
  - 显示「刺身盛合わせ」（日文原文）
  - 不显示翻译（「刺身拼盘」不出现）
  - 字体大，全屏展示
优先级: P0
Sprint: Sprint 1
```

### TC-L409: 用户行为 U1 — 发送空消息

```
步骤: 在输入框不输入内容，直接点发送（或回车）
期望结果:
  - 不发送 API 请求
  - 输入框保持焦点
  - 无报错
优先级: P1
Sprint: Sprint 1
```

### TC-L410: 用户行为 U2 — 连续快速点击发送

```
步骤:
  1. 输入「推荐菜」
  2. 在 50ms 内连续点击发送按钮 5 次
期望结果:
  - /api/chat 只触发 1 次
  - 对话中只出现 1 条用户消息
优先级: P1
Sprint: Sprint 1
```

### TC-L411: 技术边界 T3 — AI 返回非 JSON（Zod 兜底）

```
前置条件: /api/analyze 返回 502 AI_INVALID_RESPONSE
步骤: 触发菜单识别
期望结果:
  - 显示错误提示（"识别失败，请重拍"，DEC-019）
  - 无 JS 报错崩溃
  - 提供「重拍」按钮
优先级: P0
Sprint: Sprint 1
```

### TC-L412: 安全 S2 — 构建产物不含 API Key

```
步骤:
  1. 执行 pnpm build
  2. grep -r "sk-" dist/
期望结果: grep 输出为空（无任何 API Key 存在于构建产物）
优先级: P0（每次 CI 必执行）
Sprint: Sprint 1
```

### TC-L413: 安全 S3 — 非白名单 Origin 被拒绝

```
步骤: 发送 POST /api/analyze，Origin: https://evil.com
期望结果: 
  - HTTP 403
  - 响应体含 error.code = "ORIGIN_NOT_ALLOWED"
优先级: P0
Sprint: Sprint 1
```

### TC-L414: 安全 S1 — XSS 注入防御

```
步骤:
  1. Mock AI 返回菜名为 '<img src=x onerror=alert(1)>'
  2. 渲染 DishCard
期望结果:
  - 菜名显示为纯文本（转义后字符串）
  - 无弹窗，无 XSS 执行
优先级: P0
Sprint: Sprint 1
```

---

## L5 — 真机测试（手动执行）

> 执行人: Mr. Xia 或指定测试员
> 设备要求: iOS 16+ / Android 10+，真实 4G/WiFi 环境

---

### TC-L501: 真实相机 — 拍摄中文菜单

```
场景: 在真实餐厅拍摄中文菜单
步骤:
  1. 打开 SAGE Web App（Safari/Chrome）
  2. 点击「扫描菜单」
  3. 拍摄 1 张真实中文菜单
  4. 确认上传
期望结果:
  - 相机正常调用
  - 图片清晰显示在预览栏
  - AI 识别成功，菜品准确率 > 80%
  - 开场白自然
优先级: P0
Sprint: Sprint 1（Alpha 验收）
```

### TC-L502: 真实相机 — 拍摄日文菜单（5 张）

```
步骤:
  1. 拍摄居酒屋菜单（分 5 张拍完整菜单）
  2. 全部上传确认
期望结果:
  - 5 张图片全部预览正确
  - 合并识别后菜品数量合理（> 20 道）
  - 日文 nameOriginal 正确保留
  - WaiterMode 显示日文原文
优先级: P0
Sprint: Sprint 1（Alpha 验收）
```

### TC-L503: 真实网络 — 4G 弱网环境

```
环境: 地铁/电梯（模拟弱网）
步骤: 执行完整 Path A
期望结果:
  - Icebreaker 立即出现（无需 API）
  - 菜单识别可能慢，有加载状态
  - 不崩溃，不卡死
  - 超时时显示友好错误
优先级: P1
Sprint: Sprint 1（Alpha 验收）
```

### TC-L504: 低端设备 — Android 2GB RAM

```
设备: 低端 Android 手机（2GB RAM）
步骤: 执行完整 Path A（含 5 张图片）
期望结果:
  - 不 OOM Crash
  - 帧率可接受（> 30fps 滚动）
  - 图片处理不卡死
优先级: P1
Sprint: Sprint 2
```

### TC-L505: 手写菜单识别（场景 M6）

```
输入: 黑板菜单照片（手写字体）
期望结果:
  - 能识别出主要菜品（识别率 > 60%）
  - 无法识别的菜品 nameTranslated = "（无法识别）"
  - 不崩溃
优先级: P2
Sprint: Sprint 2
```

### TC-L506: 阿拉伯文 RTL 菜单（场景 M5）

```
输入: 阿拉伯文餐厅菜单
期望结果:
  - AI 能识别阿拉伯文菜名
  - nameOriginal 保留阿拉伯文字符
  - nameTranslated 翻译到用户语言
  - 价格（如含阿拉伯数字）正确解析
优先级: P2
Sprint: Sprint 2
```

---

## 场景矩阵测试（M1–M12 对应 L5 真机）

| 场景 | 菜单类型 | 优先级 | Sprint |
|------|---------|--------|--------|
| M1 | 中文标准菜单 | P0 | Sprint 1 |
| M2 | 英文西餐菜单 | P0 | Sprint 1 |
| M3 | 日文菜单（含汉字）| P0 | Sprint 1 |
| M4 | 泰文菜单（含 ฿）| P1 | Sprint 2 |
| M5 | 阿拉伯文菜单 RTL | P2 | Sprint 2 |
| M6 | 手写/黑板菜单 | P2 | Sprint 2 |
| M7 | 多页菜单（补充拍摄）| P0 | Sprint 1 |
| M8 | 酒单（精装本）| P1 | Sprint 2 |
| M9 | 甜品菜单 | P1 | Sprint 2 |
| M10 | 图片菜单（有实物图）| P1 | Sprint 2 |
| M11 | 套餐规则型菜单 | P2 | Sprint 3 |
| M12 | 极简菜单（纯菜名）| P1 | Sprint 2 |

---

## 质量门跟踪

### Sprint 1 → Sprint 2 准入标准

| 检查项 | 状态 |
|--------|------|
| L1 全部通过（TC-L101 ~ L112）| ⏳ 待执行 |
| L2 全部通过（TC-L201 ~ L211）| ⏳ 待执行 |
| L3 P0 用例全部通过 | ⏳ 待执行 |
| L4 P0 用例全部通过 | ⏳ 待执行 |
| TC-L412（API Key 不泄露）通过 | ⏳ 待执行 |
| L5 真机 TC-L501/502 通过 | ⏳ 待执行 |
| `pnpm build` 零警告零错误 | ⏳ 待执行 |

---

## 测试 Fixture 文件规划

```
tests/
├── fixtures/
│   ├── menus/
│   │   ├── chinese-standard.json     # M1 中文标准菜单 AnalyzeResponse
│   │   ├── japanese-izakaya.json     # M3 日文居酒屋
│   │   ├── thai-street-food.json     # M4 泰文街头小吃
│   │   └── western-brunch.json       # M2 英文西餐
│   ├── chat/
│   │   ├── basic-recommendation.json # 基础推荐对话响应
│   │   ├── allergy-filter.json       # 过敏筛选对话
│   │   └── preference-update.json    # 偏好提炼对话
│   └── images/
│       ├── chinese-menu.jpg          # 真实菜单扫描图（脱敏）
│       └── japanese-menu-5pages/     # 5 张日文菜单
│           ├── page1.jpg
│           ├── page2.jpg
│           ├── page3.jpg
│           ├── page4.jpg
│           └── page5.jpg
```

---

*文档版本 v1.0，由 SAGE Agent 起草。测试用例将在 Sprint 1 开发期间持续完善。*
