# specs/ — 功能规格文档

本目录存放所有功能的规格文档，是 Spec-Driven 研发方法论的核心载体。

## 命名规范

```
specs/
├── README.md                    # 本文件
├── SPEC-001-feature-name.md     # 按编号 + 功能名命名
├── SPEC-002-feature-name.md
└── ...
```

## 规格文档模板

每个 Spec 应包含：

```markdown
# SPEC-XXX: 功能名称

## 概述
一句话说明这个功能是什么、为谁解决什么问题。

## 输入
- 用户输入 / API 请求 / 触发条件

## 输出
- 预期结果 / API 响应 / UI 变化

## 边界条件
- 异常情况如何处理
- 性能约束
- 安全约束

## 验收标准（AC）
- [ ] AC-1: ...
- [ ] AC-2: ...

## 关联
- PRD 功能编号: F-XX
- API 端点: POST /api/xxx
- 测试文件: tests/xxx.test.ts
```

## 使用规则

1. **开发前必须有 Spec** — 没有 spec 不开工
2. **Spec 是契约** — 实现必须满足 spec 中所有 AC
3. **Spec 可迭代** — 发现问题随时更新，但需记录变更原因
4. **AI agent 可读** — 写清楚到 AI agent 能直接据此生成测试和代码的程度
