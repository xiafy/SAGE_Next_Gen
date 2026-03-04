#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo -e "${GREEN}═══ SAGE 质量扫描 $(date '+%Y-%m-%d %H:%M') ═══${NC}\n"

# 1. 编译状态
echo -e "${YELLOW}▶ TypeScript 编译${NC}"
APP_TSC=0; WORKER_TSC=0
( cd app && npx tsc --noEmit 2>&1 ) && echo -e "${GREEN}  ✓ app/ 通过${NC}" || { echo -e "${RED}  ✗ app/ 失败${NC}"; APP_TSC=1; }
( cd worker && npx tsc --noEmit 2>&1 ) && echo -e "${GREEN}  ✓ worker/ 通过${NC}" || { echo -e "${RED}  ✗ worker/ 失败${NC}"; WORKER_TSC=1; }

# 2. 测试状态
echo -e "\n${YELLOW}▶ 测试${NC}"
TEST_RESULT=0
( cd app && npx vitest run --reporter=dot 2>&1 ) || TEST_RESULT=1
if [ "$TEST_RESULT" -eq 0 ]; then
  echo -e "${GREEN}  ✓ 全部通过${NC}"
else
  echo -e "${RED}  ✗ 有测试失败${NC}"
fi

# 3. 技术债
echo -e "\n${YELLOW}▶ 技术债扫描${NC}"
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" app/src/ worker/handlers/ worker/prompts/ worker/utils/ worker/schemas/ worker/middleware/ 2>/dev/null | wc -l | tr -d ' ')
echo "  TODO/FIXME/HACK: $TODO_COUNT 处"
if [ "$TODO_COUNT" -gt 0 ]; then
  grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" app/src/ worker/handlers/ worker/prompts/ worker/utils/ worker/schemas/ worker/middleware/ 2>/dev/null | head -10
fi

# 4. Git 状态
echo -e "\n${YELLOW}▶ Git 状态${NC}"
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
echo "  未推送 commits: $UNPUSHED"
echo "  未提交变更: $UNCOMMITTED"

# 5. 测试覆盖率摘要
echo -e "\n${YELLOW}▶ 文件统计${NC}"
TEST_FILES=$(find app/src -name "*.test.*" | wc -l | tr -d ' ')
SRC_FILES=$(find app/src -name "*.ts" -o -name "*.tsx" | grep -v test | grep -v __tests__ | wc -l | tr -d ' ')
echo "  源文件: $SRC_FILES / 测试文件: $TEST_FILES"

# 汇总
echo -e "\n${GREEN}═══ 汇总 ═══${NC}"
SCORE=0
[ "$APP_TSC" -eq 0 ] && SCORE=$((SCORE+1))
[ "$WORKER_TSC" -eq 0 ] && SCORE=$((SCORE+1))
[ "$TEST_RESULT" -eq 0 ] && SCORE=$((SCORE+1))
[ "$UNPUSHED" -eq 0 ] && SCORE=$((SCORE+1))
echo "  质量评分: $SCORE/4"
[ "$SCORE" -eq 4 ] && echo -e "${GREEN}  ✅ 全绿${NC}" || echo -e "${YELLOW}  ⚠️  有待修复项${NC}"


# 6. 深层卫生扫描
echo -e "\n${YELLOW}▶ 深层卫生扫描${NC}"

# 6a. God Component 检测
echo "  --- God Components (>500 行) ---"
GOD_COUNT=0
for f in $(find app/src worker/handlers worker/prompts worker/utils worker/schemas shared -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -v node_modules | grep -v '__tests__' | grep -v '.test.'); do
  [ -f "$f" ] || continue
  LINES=$(wc -l < "$f" | tr -d ' ')
  if [ "$LINES" -gt 500 ]; then
    echo "    ⚠ $f: $LINES 行"
    GOD_COUNT=$((GOD_COUNT + 1))
  fi
done
[ "$GOD_COUNT" -eq 0 ] && echo "    ✓ 无 God Component"

# 6b. Stale 文档引用检测 (python3)
echo "  --- Stale 文档引用 ---"
STALE_OUTPUT=$(python3 -c "
import re, os, glob
stale = 0
for doc in glob.glob('docs/**/*.md', recursive=True) + glob.glob('specs/*.md'):
    if not os.path.isfile(doc): continue
    doc_dir = os.path.dirname(doc)
    with open(doc) as f:
        content = f.read()
    refs = re.findall(r'\x60([a-zA-Z][a-zA-Z0-9_/.-]+\.(?:ts|tsx|md|sh))\x60', content)
    for ref in refs[:20]:
        if '/' not in ref: continue
        if ref.startswith('http'): continue
        # 检查：仓库根 或 文档所在目录
        if os.path.exists(ref) or os.path.exists(os.path.join(doc_dir, ref)):
            continue
        print(f'    ⚠ {doc} → {ref}')
        stale += 1
if stale == 0:
    print('    ✓ 无 stale 引用')
" 2>/dev/null || echo "    ⚠ python3 不可用，跳过")
echo "$STALE_OUTPUT"
STALE_COUNT=$(echo "$STALE_OUTPUT" | grep -c "⚠" 2>/dev/null) || STALE_COUNT=0

echo ""
echo "  God Components: $GOD_COUNT | Stale 文档引用: $STALE_COUNT"

# 7. 仓库一致性检查
echo -e "\n${YELLOW}▶ 仓库一致性检查${NC}"

CONSISTENCY_ISSUES=0

# 7a. 根目录游离文件（不应有图片、已完成 TASK）
echo "  --- 根目录规范 ---"
ROOT_IMGS=$(find . -maxdepth 1 \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" -o -name "*.gif" \) 2>/dev/null)
if [ -n "$ROOT_IMGS" ]; then
  echo "    ✗ 根目录有游离图片:"
  echo "$ROOT_IMGS" | sed 's/^/      /'
  CONSISTENCY_ISSUES=$((CONSISTENCY_ISSUES + 1))
else
  echo "    ✓ 根目录无游离图片"
fi

ROOT_TASKS=$(find . -maxdepth 1 -name "TASK_*.md" ! -name "TASK_TEMPLATE.md" 2>/dev/null)
if [ -n "$ROOT_TASKS" ]; then
  echo "    ⚠ 根目录有未归档的 TASK（完成后应移到 archive/tasks/）:"
  echo "$ROOT_TASKS" | sed 's/^/      /'
  CONSISTENCY_ISSUES=$((CONSISTENCY_ISSUES + 1))
fi

# 7b. docs/ 根目录不应有游离 .md 文件（应归入子目录）
echo "  --- docs/ 目录规范 ---"
DOCS_ROOT_FILES=$(find docs/ -maxdepth 1 -name "*.md" 2>/dev/null)
if [ -n "$DOCS_ROOT_FILES" ]; then
  echo "    ✗ docs/ 根目录有游离文件（应归入 product/technical/engineering/gtm）:"
  echo "$DOCS_ROOT_FILES" | sed 's/^/      /'
  CONSISTENCY_ISSUES=$((CONSISTENCY_ISSUES + 1))
else
  echo "    ✓ docs/ 目录结构规范"
fi

# 7c. 全量文件引用一致性（所有 .md 中引用的 .ts/.tsx/.md/.sh 是否存在）
echo "  --- 跨文档引用一致性 ---"
REF_OUTPUT=$(python3 -c "
import re, os, glob

issues = 0
checked = 0
# 只检查活跃文档，不检查历史日志（PROGRESS/DECISIONS 记录的是历史快照）
skip_files = {'PROGRESS.md', 'DECISIONS.md'}
for doc in glob.glob('**/*.md', recursive=True):
    if 'node_modules' in doc or '.git' in doc or 'archive/' in doc:
        continue
    if os.path.basename(doc) in skip_files:
        continue
    if not os.path.isfile(doc): continue
    doc_dir = os.path.dirname(doc)
    with open(doc) as f:
        content = f.read()
    refs = re.findall(r'\x60([a-zA-Z][a-zA-Z0-9_/.-]+\.(?:ts|tsx|sh))\x60', content)
    for ref in set(refs):
        checked += 1
        # 从仓库根检查
        if os.path.exists(ref):
            continue
        # 从文档所在目录检查（相对路径）
        if os.path.exists(os.path.join(doc_dir, ref)):
            continue
        # 排除短文件名（无路径分隔符的单文件引用，通常是示例或简写）
        if '/' not in ref:
            continue
        # 排除明显的示例/伪代码
        if any(x in ref for x in ['example', 'xxx', 'your-', 'PascalCase', 'camelCase']):
            continue
        print(f'    ⚠ {doc} → {ref}')
        issues += 1
        if issues >= 10:
            print(f'    ... (截断，共 {issues}+ 处)')
            break
    if issues >= 10:
        break
if issues == 0:
    print(f'    ✓ {checked} 个引用全部有效')
else:
    print(f'    共 {issues} 个引用指向不存在的文件')
" 2>/dev/null || echo "    ⚠ python3 不可用，跳过")
echo "$REF_OUTPUT"
REF_ISSUES=$(echo "$REF_OUTPUT" | grep -c "⚠" 2>/dev/null) || REF_ISSUES=0

echo ""
echo "  一致性问题: $((CONSISTENCY_ISSUES + REF_ISSUES))"

# 8. 业务一致性检查（调用独立脚本）
echo -e "\n${YELLOW}▶ 业务一致性检查${NC}"
bash "$REPO_ROOT/scripts/check-consistency.sh" 2>&1 | grep -v "^═══" | sed 's/^/  /'
