# Test Checklist — F13 语音输入

## A. 支持场景（Happy Path）
- [ ] A1 Chat 输入栏出现🎤按钮（支持 Web Speech API 的浏览器）
- [ ] A2 按住🎤按钮，按钮变为脉冲动画，视觉上表示"录音中"
- [ ] A3 松手后识别结果自动填入并发送，AI 正常回复
- [ ] A4 中文语音正确识别（`zh-CN`）
- [ ] A5 英文语音正确识别（`en-US`）
- [ ] A6 语言跟随 UI 设置（切换中/英 → 识别语言跟变）

## B. 降级场景
- [ ] B1 浏览器不支持 Web Speech API → 🎤按钮不显示，文字输入正常
- [ ] B2 录音时拒绝麦克风权限 → Toast 提示，不崩溃
- [ ] B3 识别无结果（静音）→ 无操作，不发送空消息
- [ ] B4 AI streaming 进行中按🎤 → 按钮置灰/无响应

## C. 构建验证
- [ ] C1 `tsc --noEmit` 零错误
- [ ] C2 `npm run build` 成功
- [ ] C3 E2E smoke 7/7 通过（不含语音 API mock，降级路径为主）
