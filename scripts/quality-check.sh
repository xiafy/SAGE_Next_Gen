#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# 报告持久化
REPORT_DATE=$(date '+%Y-%m-%d')
REPORT_DIR="$REPO_ROOT/archive/reports/daily-scan"
REPORT_FILE="$REPORT_DIR/$REPORT_DATE.md"
mkdir -p "$REPORT_DIR"

# 清空旧报告（同一天多次运行时覆盖）
echo "# SAGE 质量扫描 — $REPORT_DATE $(date '+%H:%M')" > "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# 写入函数（终端彩色 + 文件纯文本）
log() {
  echo -e "$@"
  echo -e "$@" | sed $'s/\033\\[[0-9;]*m//g' >> "$REPORT_FILE"
}

# ─── 指标收集变量 ───
M_TSC="✓"; M_TEST="✓"; M_DEBT=0; M_GOD=0; M_STALE=0
M_ROUTE="✓"; M_SPEC_COV="?"; M_AC_COV="?"; M_CONSISTENCY=0
M_SCORE=0

log "${GREEN}═══ SAGE 质量扫描 $(date '+%Y-%m-%d %H:%M') ═══${NC}\n"

# 1. 编译
log "${YELLOW}▶ TypeScript 编译${NC}"
APP_TSC=0; WORKER_TSC=0
( cd app && npx tsc --noEmit 2>&1 ) && log "${GREEN}  ✓ app/ 通过${NC}" || { log "${RED}  ✗ app/ 失败${NC}"; APP_TSC=1; M_TSC="✗"; }
( cd worker && npx tsc --noEmit 2>&1 ) && log "${GREEN}  ✓ worker/ 通过${NC}" || { log "${RED}  ✗ worker/ 失败${NC}"; WORKER_TSC=1; M_TSC="✗"; }

# 2. 测试
log "\n${YELLOW}▶ 测试${NC}"
TEST_RESULT=0
TEST_OUTPUT=$( cd app && npx vitest run --reporter=dot 2>&1 ) || TEST_RESULT=1
TEST_SUMMARY=$(echo "$TEST_OUTPUT" | grep "Tests" | tail -1)
if [ "$TEST_RESULT" -eq 0 ]; then
  log "${GREEN}  ✓ $TEST_SUMMARY${NC}"
else
  log "${RED}  ✗ 有测试失败${NC}"
  M_TEST="✗"
fi

# 3. 技术债
log "\n${YELLOW}▶ 技术债扫描${NC}"
M_DEBT=$(grep -r "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" app/src/ worker/handlers/ worker/prompts/ worker/utils/ worker/schemas/ worker/middleware/ 2>/dev/null | wc -l | tr -d ' ')
log "  TODO/FIXME/HACK: $M_DEBT 处"

# 4. Git 状态
log "\n${YELLOW}▶ Git 状态${NC}"
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
log "  未推送 commits: $UNPUSHED"
log "  未提交变更: $UNCOMMITTED"

# 5. 文件统计
log "\n${YELLOW}▶ 文件统计${NC}"
TEST_FILES=$(find app/src -name "*.test.*" | wc -l | tr -d ' ')
SRC_FILES=$(find app/src -name "*.ts" -o -name "*.tsx" | grep -v test | grep -v __tests__ | wc -l | tr -d ' ')
log "  源文件: $SRC_FILES / 测试文件: $TEST_FILES"

# 基础评分
M_SCORE=0
[ "$APP_TSC" -eq 0 ] && M_SCORE=$((M_SCORE+1))
[ "$WORKER_TSC" -eq 0 ] && M_SCORE=$((M_SCORE+1))
[ "$TEST_RESULT" -eq 0 ] && M_SCORE=$((M_SCORE+1))
[ "$UNPUSHED" -eq 0 ] && M_SCORE=$((M_SCORE+1))
log "\n${GREEN}═══ 基础评分: $M_SCORE/4 ═══${NC}"

# 6. 深层卫生
log "\n${YELLOW}▶ 深层卫生扫描${NC}"

log "  --- God Components (>500 行) ---"
M_GOD=0
for f in $(find app/src worker/handlers worker/prompts worker/utils worker/schemas shared -name '*.ts' -o -name '*.tsx' 2>/dev/null | grep -v node_modules | grep -v '__tests__' | grep -v '.test.'); do
  [ -f "$f" ] || continue
  LINES=$(wc -l < "$f" | tr -d ' ')
  if [ "$LINES" -gt 500 ]; then
    log "    ⚠ $f: $LINES 行"
    M_GOD=$((M_GOD + 1))
  fi
done
[ "$M_GOD" -eq 0 ] && log "    ✓ 无 God Component"

log "  --- Stale 文档引用 ---"
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
        if os.path.exists(ref) or os.path.exists(os.path.join(doc_dir, ref)):
            continue
        print(f'    ⚠ {doc} → {ref}')
        stale += 1
if stale == 0:
    print('    ✓ 无 stale 引用')
" 2>/dev/null || echo "    ⚠ python3 不可用")
log "$STALE_OUTPUT"
M_STALE=$(echo "$STALE_OUTPUT" | grep -c "⚠" 2>/dev/null) || M_STALE=0

log "\n  God Components: $M_GOD | Stale 引用: $M_STALE"

# 7. 仓库一致性
log "\n${YELLOW}▶ 仓库一致性检查${NC}"

ROOT_IMGS=$(find . -maxdepth 1 \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) 2>/dev/null)
if [ -n "$ROOT_IMGS" ]; then
  log "  ${RED}✗ 根目录有游离图片${NC}"
  M_CONSISTENCY=$((M_CONSISTENCY + 1))
else
  log "  ✓ 根目录规范"
fi

DOCS_ROOT_FILES=$(find docs/ -maxdepth 1 -name "*.md" 2>/dev/null)
if [ -n "$DOCS_ROOT_FILES" ]; then
  log "  ${RED}✗ docs/ 根目录有游离文件${NC}"
  M_CONSISTENCY=$((M_CONSISTENCY + 1))
else
  log "  ✓ docs/ 目录规范"
fi

# 跨文档引用
REF_OUTPUT=$(python3 -c "
import re, os, glob
skip_files = {'PROGRESS.md', 'DECISIONS.md'}
issues = 0; checked = 0
for doc in glob.glob('**/*.md', recursive=True):
    if 'node_modules' in doc or '.git' in doc or 'archive/' in doc: continue
    if os.path.basename(doc) in skip_files: continue
    if not os.path.isfile(doc): continue
    doc_dir = os.path.dirname(doc)
    with open(doc) as f:
        content = f.read()
    refs = re.findall(r'\x60([a-zA-Z][a-zA-Z0-9_/.-]+\.(?:ts|tsx|sh))\x60', content)
    for ref in set(refs):
        checked += 1
        if '/' not in ref: continue
        if os.path.exists(ref) or os.path.exists(os.path.join(doc_dir, ref)): continue
        if any(x in ref for x in ['example','xxx','your-','PascalCase','camelCase']): continue
        print(f'  ⚠ {doc} → {ref}')
        issues += 1
        if issues >= 10: break
    if issues >= 10: break
if issues == 0:
    print(f'  ✓ {checked} 个引用全部有效')
" 2>/dev/null || echo "  ⚠ python3 不可用")
log "$REF_OUTPUT"

# 8. 业务一致性
log "\n${YELLOW}▶ 业务一致性检查${NC}"

# 8a. API 路由对齐
DOC_EP=$(grep -oE '(GET|POST|PUT|DELETE) /api/[a-z_/-]+' docs/technical/api-design.md 2>/dev/null | sort -u)
CODE_EP=$(python3 -c "
import re
with open('worker/index.ts') as f: c = f.read()
for m in re.finditer(r\"request\.method === '(GET|POST)' && url\.pathname === '(/api/[a-z_/-]+)'\", c):
    print(f'{m.group(1)} {m.group(2)}')
" 2>/dev/null | sort -u)

ROUTE_ERR=0
while IFS= read -r ep; do
  [ -z "$ep" ] && continue
  echo "$DOC_EP" | grep -qF "$ep" || { log "  🔴 代码有但文档无: $ep"; ROUTE_ERR=$((ROUTE_ERR + 1)); }
done <<< "$CODE_EP"
while IFS= read -r ep; do
  [ -z "$ep" ] && continue
  echo "$CODE_EP" | grep -qF "$ep" || { log "  ⚠ 文档有但代码无: $ep"; }
done <<< "$DOC_EP"
[ "$ROUTE_ERR" -eq 0 ] && M_ROUTE="✓" || M_ROUTE="✗($ROUTE_ERR)"

# 8b. Feature→Spec 覆盖
PRD_FEATURES=$(grep -oE 'F[0-9]+' docs/product/prd.md | sort -u)
TOTAL_F=$(echo "$PRD_FEATURES" | grep -c . 2>/dev/null || echo 0)
COVERED_F=0
while IFS= read -r feat; do
  [ -z "$feat" ] && continue
  for spec in specs/*.md; do
    grep -qi "$feat" "$spec" 2>/dev/null && { COVERED_F=$((COVERED_F + 1)); break; }
  done
done <<< "$PRD_FEATURES"
M_SPEC_COV="$COVERED_F/$TOTAL_F"
log "  Spec 覆盖: $M_SPEC_COV"

# 8c. AC→测试覆盖（F{xx}-AC{yy} 格式，仅 MVP）
AC_OUTPUT=$(python3 -c "
import re, glob, os

# --- 分母：从 PRD 提取 MVP 功能的 F{xx}-AC{yy} ---
with open('docs/product/prd.md') as f: prd = f.read()
# 按 ### F 分段
sections = re.split(r'(?=^### )', prd, flags=re.MULTILINE)
all_acs = set()
for sec in sections:
    hdr = re.match(r'### .*?(F\d+)', sec)
    if not hdr: continue
    feat = hdr.group(1)
    # 排除非 MVP：已删除 / Sprint 2 / Sprint 3 / Future / Backlog
    first_line = sec.split('\n')[0]
    if any(tag in first_line for tag in ['已删除', 'Sprint 2', 'Sprint 3', 'Future', 'Backlog']):
        continue
    if re.search(r'\*\*优先级\*\*.*\[Sprint [23]\]', sec):
        continue
    if re.search(r'\*\*优先级\*\*.*\[Future\]', sec):
        continue
    # 提取该段内所有 AC
    for m in re.finditer(r'-\s+\*?\*?AC(\d+)', sec):
        all_acs.add(f'{feat}-AC{m.group(1)}')

# --- 分子：从测试文件提取 F{xx}-AC{yy} ---
test_acs = set()
search_paths = (
    glob.glob('app/src/**/*.test.*', recursive=True)
    + glob.glob('worker/**/*.test.*', recursive=True)
    + glob.glob('tests/**/*.md', recursive=True)
)
for f in search_paths:
    if not os.path.isfile(f): continue
    with open(f) as fh: t = fh.read()
    for m in re.finditer(r'F(\d+)[-_]AC(\d+)', t):
        test_acs.add(f'F{m.group(1)}-AC{m.group(2)}')

covered = all_acs & test_acs
print(f'{len(covered)}/{len(all_acs)} (MVP)')
" 2>/dev/null || echo "?/?")
M_AC_COV="$AC_OUTPUT"
log "  AC 覆盖: $M_AC_COV"

# ─── 指标摘要 ───
log "\n${CYAN}═══════════════════════════════════════${NC}"
log "${CYAN}  指标摘要${NC}"
log "${CYAN}═══════════════════════════════════════${NC}"
log "  编译: $M_TSC | 测试: $M_TEST | 基础分: $M_SCORE/4"
log "  技术债: $M_DEBT | God组件: $M_GOD | Stale引用: $M_STALE"
log "  路由对齐: $M_ROUTE | Spec覆盖: $M_SPEC_COV | AC覆盖: $M_AC_COV"

# 写入 CSV 格式趋势行（追加到趋势文件）
TREND_FILE="$REPORT_DIR/trend.csv"
if [ ! -f "$TREND_FILE" ]; then
  echo "日期,编译,测试,基础分,技术债,God组件,Stale引用,路由对齐,Spec覆盖,AC覆盖" > "$TREND_FILE"
fi
echo "$REPORT_DATE,$M_TSC,$M_TEST,$M_SCORE/4,$M_DEBT,$M_GOD,$M_STALE,$M_ROUTE,$M_SPEC_COV,$M_AC_COV" >> "$TREND_FILE"

log "\n📄 报告已保存: $REPORT_FILE"
log "📊 趋势数据: $TREND_FILE"

# ─── 🔴 级问题置顶 ───
if [ "$ROUTE_ERR" -gt 0 ] || [ "$M_TSC" = "✗" ] || [ "$M_TEST" = "✗" ]; then
  log "\n${RED}🔴 发现阻断级问题，需要当天修复：${NC}"
  [ "$M_TSC" = "✗" ] && log "${RED}  - TypeScript 编译失败${NC}"
  [ "$M_TEST" = "✗" ] && log "${RED}  - 测试失败${NC}"
  [ "$ROUTE_ERR" -gt 0 ] && log "${RED}  - API 路由与文档不一致 ($ROUTE_ERR 处)${NC}"
fi
