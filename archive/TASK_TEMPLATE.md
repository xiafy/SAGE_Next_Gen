# TASK_TEMPLATE.md — 编码任务下发模板

> SAGE Agent 向 Claude Code 下发任务时，必须使用此模板。
> 禁止在 TASK.md 中内联 API schema 或类型定义——必须引用源文件。

---

## 模板

```markdown
# TASK: [任务名称]

## 必读文件（开始编码前先 cat 以下文件）

- `CLAUDE.md` §0-§8 — Agent 行为基准
- `02_product/PRD.md` 的 [F编号] 章节 — 验收标准
- `04_technical/API_DESIGN.md` 的 [§编号] — API 契约
- `05_implementation/shared/types.ts` — 权威类型定义
- [其他相关文件，如 worker handler 或现有 view 代码]

## PRD 验收标准清单（完成后逐条确认）

- [ ] [F编号] AC1: [具体验收条件]
- [ ] [F编号] AC2: [具体验收条件]
- [ ] ...

## 契约断言（完成后 grep 验证）

```bash
# 示例
grep -n "restrictions" src/api/chat.ts          # 确认偏好传递
grep -n "SET_CHAT_PHASE.*failed" src/context/   # 确认 failed 态存在
grep -n "import.*shared/types" src/api/         # 确认从 shared 导入
```

## 技术约束

- 所有 API 相关类型必须从 `shared/types.ts` 导入，禁止重新定义
- Tailwind v4：用 `@theme`，不用 `tailwind.config.js`
- 禁止 `any`、禁止 `console.log`
- 百炼 API 调用必须有 `enable_thinking: false`（DEC-028）

## 任务描述

[具体编码要求，但不内联 schema。用"按照 shared/types.ts 的 ChatRequest 接口"代替复述接口定义]

## 完成后自检

1. `npx tsc --noEmit` — 零错误
2. `pnpm build` — 零警告
3. 上方"PRD 验收标准清单"全部打 ✅
4. 上方"契约断言"全部 grep 通过
5. 状态机 trace：手动确认主路径 home → scanner → chat → order → waiter 无断裂

## 完成信号

TASK_DONE
```

---

## 使用示例

### 示例：AgentChat 补充菜单入口

```markdown
# TASK: AgentChat Path C 相机入口修复

## 必读文件

- `02_product/PRD.md` 第 119-145 行（F02 Scanner）+ 第 215-260 行（F06 AgentChat）
- `04_technical/API_DESIGN.md` §2（/api/analyze）
- `05_implementation/shared/types.ts`
- `05_implementation/app/src/views/AgentChatView.tsx`（当前实现）
- `05_implementation/app/src/context/AppContext.tsx`（状态机）

## PRD 验收标准清单

- [ ] F02 AC7: Path C 进入时保持 AgentChat 对话历史，返回后可继续对话
- [ ] F06 AC5: 底部输入栏含「📷 补充菜单」按钮（Path C 入口）
- [ ] F06 AC6: 补充菜单图片识别后合并到现有 menuData

## 契约断言

```bash
grep -n "SET_SUPPLEMENTING" src/views/AgentChatView.tsx   # 相机入口设置标记
grep -n "isSupplementing" src/views/ScannerView.tsx        # Scanner 读取标记
grep -n "isSupplementing" src/context/AppContext.tsx        # 状态管理
```

## 任务描述

修复 AgentChatView 中相机按钮的 Path C 逻辑：
1. 点击相机图标时，先 dispatch SET_SUPPLEMENTING(true)，再 NAV_TO('scanner')
2. ScannerView 完成后根据 isSupplementing 决定返回目标（true → chat，false → home）

## 完成信号

TASK_DONE
```

---

## 反模式（禁止）

### ❌ 内联 API schema

```markdown
# 错误示例
/api/chat 请求体：
{
  "mode": "pre_chat",
  "messages": [...],
  "preferences": {"restrictions":[],"flavors":[],"history":[]}
}
```

**为什么错**：简化版丢失了字段结构（如 restrictions 应该是 `{type, value}[]` 而非 `string[]`），Claude Code 会照着简化版写代码。

### ✅ 正确做法

```markdown
请求体类型严格按照 `shared/types.ts` 的 `ChatRequest` 接口。
开始前先 `cat 05_implementation/shared/types.ts` 确认字段。
```
