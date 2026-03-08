# Agent Swarm Operations

> **状态**: 待完善 (Sprint 4a+)
> **引用自**: `docs/engineering/cross-review-workflow.md`

本文档描述多 Agent 协作的编排规范（Agent Swarm 操作手册）。

## 概述

当单一 Agent 无法完成复杂任务时，使用 Agent Swarm 模式：
- Orchestrator（SAGE 主进程）负责任务分解和派发
- Sub-agents（Claude Code / Codex）负责具体实现
- 协议：TASK_TEMPLATE_IMPL.md / TASK_TEMPLATE_TEST.md

## 派发协议

详见 `AGENTS.md § 派发协议`。

## 监控和回收

- Sub-agent 完成后推送战报
- Orchestrator 执行质量门控（三级）
- 失败任务重派或上报夏总

## 手动 Fallback

如自动化流程不可用：
1. 手动编写 TASK.md（参考模板）
2. 通过 `sessions_spawn` 派发
3. 质量门控后 `git commit`
