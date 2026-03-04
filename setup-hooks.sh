#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"

chmod +x "$REPO_ROOT/.githooks/pre-commit" "$REPO_ROOT/.githooks/commit-msg"
git config core.hooksPath .githooks

echo "✓ Git hooks installed (core.hooksPath → .githooks/)"
echo "  pre-commit: TypeScript 编译 + vitest 测试"
echo "  commit-msg: Prompt I/O diff + fix: 测试关联"
