#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo -e "${CYAN}═══ SAGE 一致性检查 $(date '+%Y-%m-%d %H:%M') ═══${NC}\n"

ISSUES=0
WARNINGS=0

# ────────────────────────────────────────────
# 检查 1: API 路由对齐
# api-design.md 定义的 endpoints vs worker/index.ts 实际注册的路由
# ────────────────────────────────────────────
echo -e "${YELLOW}[1/5] API 路由对齐${NC}"
echo "  docs/technical/api-design.md ↔ worker/index.ts"

DOC_ENDPOINTS=$(grep -oE '(GET|POST|PUT|DELETE) /api/[a-z_-]+' docs/technical/api-design.md 2>/dev/null | sort -u)
CODE_ENDPOINTS=$(grep -oE '(GET|POST)[^/]*/api/[a-z_-]+' worker/index.ts 2>/dev/null | sed 's|.*\(/api/[a-z_-]*\)|\1|' | sort -u)
# 从 index.ts 提取 METHOD + path
CODE_ROUTES=$(python3 -c "
import re
with open('worker/index.ts') as f:
    content = f.read()
# 匹配 request.method === 'GET' && url.pathname === '/api/xxx'
for m in re.finditer(r\"request\.method === '(GET|POST)' && url\.pathname === '(/api/[a-z_-]+)'\", content):
    print(f'{m.group(1)} {m.group(2)}')
" 2>/dev/null | sort -u)

# 文档中有但代码没有
while IFS= read -r endpoint; do
  [ -z "$endpoint" ] && continue
  if ! echo "$CODE_ROUTES" | grep -qF "$endpoint"; then
    echo -e "  ${YELLOW}⚠ 文档有但代码无: $endpoint${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
done <<< "$DOC_ENDPOINTS"

# 代码中有但文档没有
while IFS= read -r endpoint; do
  [ -z "$endpoint" ] && continue
  if ! echo "$DOC_ENDPOINTS" | grep -qF "$endpoint"; then
    echo -e "  ${RED}✗ 代码有但文档无: $endpoint${NC}"
    ISSUES=$((ISSUES + 1))
  fi
done <<< "$CODE_ROUTES"

if [ "$ISSUES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
  echo -e "  ${GREEN}✓ 路由完全对齐${NC}"
fi
ROUTE_ISSUES=$ISSUES
ROUTE_WARNINGS=$WARNINGS

# ────────────────────────────────────────────
# 检查 2: shared/types.ts 类型 vs api-design.md 类型定义
# ────────────────────────────────────────────
echo -e "\n${YELLOW}[2/5] 类型契约对齐${NC}"
echo "  shared/types.ts ↔ docs/technical/api-design.md"

# 提取 api-design.md 中定义的 interface 名
DOC_TYPES=$(grep -oE 'interface [A-Z][a-zA-Z]+' docs/technical/api-design.md 2>/dev/null | awk '{print $2}' | sort -u)
CODE_TYPES=$(grep -oE 'export (interface|type) [A-Z][a-zA-Z]+' shared/types.ts 2>/dev/null | awk '{print $3}' | sort -u)

TYPE_ISSUES=0
# api-design.md 中定义的类型是否都在 shared/types.ts 中
while IFS= read -r t; do
  [ -z "$t" ] && continue
  if ! echo "$CODE_TYPES" | grep -qxF "$t"; then
    echo -e "  ${YELLOW}⚠ api-design 定义了 $t 但 shared/types.ts 中无此类型${NC}"
    TYPE_ISSUES=$((TYPE_ISSUES + 1))
  fi
done <<< "$DOC_TYPES"

if [ "$TYPE_ISSUES" -eq 0 ]; then
  DOC_TYPE_COUNT=$(echo "$DOC_TYPES" | grep -c . 2>/dev/null || echo 0)
  echo -e "  ${GREEN}✓ api-design 中 $DOC_TYPE_COUNT 个类型定义全部在 shared/types.ts 中存在${NC}"
else
  WARNINGS=$((WARNINGS + TYPE_ISSUES))
fi

# ────────────────────────────────────────────
# 检查 3: PRD Feature → Spec 覆盖
# 每个 PRD Feature 是否有对应的 spec
# ────────────────────────────────────────────
echo -e "\n${YELLOW}[3/5] PRD Feature → Spec 覆盖${NC}"
echo "  docs/product/prd.md → specs/"

PRD_FEATURES=$(grep -oE 'F[0-9]+' docs/product/prd.md | sort -u)
SPEC_FILES=$(ls specs/*.md 2>/dev/null | grep -v README)

FEATURE_MISSING=0
while IFS= read -r feat; do
  [ -z "$feat" ] && continue
  # 在 spec 文件名或内容中搜索该 Feature 编号
  FOUND=0
  for spec in $SPEC_FILES; do
    if grep -qi "$feat\b\|${feat} \|${feat}—\|${feat}:" "$spec" 2>/dev/null; then
      FOUND=1
      break
    fi
  done
  if [ "$FOUND" -eq 0 ]; then
    echo -e "  ${YELLOW}⚠ $feat 在 PRD 中定义但 specs/ 下无对应 spec${NC}"
    FEATURE_MISSING=$((FEATURE_MISSING + 1))
  fi
done <<< "$PRD_FEATURES"

TOTAL_FEATURES=$(echo "$PRD_FEATURES" | grep -c . 2>/dev/null || echo 0)
COVERED=$((TOTAL_FEATURES - FEATURE_MISSING))
echo -e "  Spec 覆盖率: $COVERED/$TOTAL_FEATURES"
if [ "$FEATURE_MISSING" -gt 0 ]; then
  WARNINGS=$((WARNINGS + FEATURE_MISSING))
fi

# ────────────────────────────────────────────
# 检查 4: PRD AC → 测试覆盖追踪
# 测试文件中是否引用了 PRD 的 AC 编号
# ────────────────────────────────────────────
echo -e "\n${YELLOW}[4/5] PRD AC → 测试覆盖追踪${NC}"
echo "  docs/product/prd.md AC → tests/ + app/src/**/*.test.*"

# 提取 PRD 中每个 Feature 的 AC 数量
python3 << 'PYEOF'
import re

with open('docs/product/prd.md') as f:
    content = f.read()

# 找每个 Feature 下的 AC 编号
features = re.findall(r'### (F\d+)[^\n]+', content)
ac_pattern = re.compile(r'- \*?\*?AC(\d+)\*?\*?:')

# 按 Feature 分段
sections = re.split(r'### F\d+', content)[1:]  # 跳过第一段（Feature 之前的内容）

total_ac = 0
for feat, section in zip(features, sections):
    acs = ac_pattern.findall(section)
    total_ac += len(acs)

# 统计测试中引用的 AC
import glob, os
test_ac_refs = set()
for pattern in ['app/src/**/*.test.*', 'tests/**/*.md']:
    for f in glob.glob(pattern, recursive=True):
        if not os.path.isfile(f): continue
        with open(f) as fh:
            text = fh.read()
        for m in re.finditer(r'AC\d+', text):
            test_ac_refs.add(m.group())

print(f"  PRD 中共 {total_ac} 个验收标准 (AC)")
print(f"  测试文件中引用了 {len(test_ac_refs)} 个不同的 AC 编号")

if len(test_ac_refs) == 0:
    print(f"  ⚠ 测试文件中没有标注 AC 编号 — 无法追踪覆盖率")
    print(f"    建议: 在测试描述中加入 AC 编号，如 it('AC1: 首屏加载 < 2s', ...)")
elif len(test_ac_refs) < total_ac * 0.5:
    print(f"  ⚠ AC 覆盖率 < 50% ({len(test_ac_refs)}/{total_ac})")
else:
    print(f"  ✓ AC 覆盖率 {len(test_ac_refs)}/{total_ac}")
PYEOF

# ────────────────────────────────────────────
# 检查 5: 文档版本号对齐
# ────────────────────────────────────────────
echo -e "\n${YELLOW}[5/5] 文档版本号追踪${NC}"

for f in docs/product/vision.md docs/product/prd.md docs/technical/api-design.md docs/technical/architecture.md docs/technical/deployment.md; do
  if [ -f "$f" ]; then
    VER=$(grep -m1 -oE 'v[0-9]+\.[0-9]+' "$f" 2>/dev/null || echo "无版本号")
    LAST_MOD=$(stat -f "%Sm" -t "%Y-%m-%d" "$f" 2>/dev/null || stat -c "%y" "$f" 2>/dev/null | cut -d' ' -f1)
    echo "  $f: $VER (最后修改: $LAST_MOD)"
  fi
done

# ────────────────────────────────────────────
# 汇总
# ────────────────────────────────────────────
echo -e "\n${CYAN}═══ 一致性检查汇总 ═══${NC}"
echo "  错误 (文档与代码不一致): $ISSUES"
echo "  警告 (可能过期或缺失): $WARNINGS"

if [ "$ISSUES" -gt 0 ]; then
  echo -e "${RED}  ✗ 存在一致性问题，需要修复${NC}"
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}  ⚠ 有警告但无阻断性错误${NC}"
else
  echo -e "${GREEN}  ✓ 全部一致${NC}"
fi
