# Prompt 测试夹具 (Test Fixtures)

## 目录结构

```
__fixtures__/
├── README.md               # 本文件
├── test-menu-thai.jpg       # 测试菜单图片（泰餐）
└── expected/
    └── (期望输出 JSON 在首次验证后生成)
```

## 用途

1. Prompt 变更时，用 `scripts/verify-prompt.sh` 对比新旧输出
2. commit-msg hook 强制 Prompt 变更附带 Before:/After: diff
3. 夹具图片是验证的"黄金输入"——AI 输出可变，但结构必须稳定

## 验证维度

- ✅ JSON Schema 合法（必须有 items 数组）
- ✅ items 每项必须有 id, nameOriginal, nameTranslated
- ✅ categories 必须有 id, nameOriginal, itemIds
- ⚠️ 具体内容（菜名、价格）允许变化（AI 不确定性）
