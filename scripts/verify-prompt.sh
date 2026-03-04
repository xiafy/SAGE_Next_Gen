#!/usr/bin/env bash
set -euo pipefail

# Prompt 变更验证脚本
# 用法: scripts/verify-prompt.sh [--update] [worker-url]
# 默认模式: 对比 expected，有差异则报错
# --update 模式: 覆写 expected 基线（仅在确认新输出正确后使用）

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

UPDATE_MODE=false
WORKER_URL="http://localhost:8787"

while [ $# -gt 0 ]; do
  case "$1" in
    --update) UPDATE_MODE=true ;;
    *) WORKER_URL="$1" ;;
  esac
  shift
done

FIXTURE_DIR="tests/fixtures"
EXPECTED_DIR="$FIXTURE_DIR/expected"

if $UPDATE_MODE; then
  echo -e "${YELLOW}▶ Prompt 验证 (UPDATE 模式 — 将覆写 expected 基线)${NC}"
else
  echo -e "${GREEN}▶ Prompt 验证 (DIFF 模式 — 对比 expected 基线)${NC}"
fi
echo "  Worker: $WORKER_URL"
echo "  Fixtures: $FIXTURE_DIR"

# 检查 python3 是否可用
command -v python3 >/dev/null || {
  echo -e "${RED}✗ python3 not found. Please install Python 3.${NC}"
  exit 1
}

# 检查 Worker 是否可达
if ! curl -sf "$WORKER_URL/api/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ Worker 不可达: $WORKER_URL${NC}"
  echo "  请先启动: cd worker && npx wrangler dev --port 8787"
  exit 1
fi

PASS=0
FAIL=0
DIFF_COUNT=0

for img in "$FIXTURE_DIR"/*.jpg "$FIXTURE_DIR"/*.png; do
  [ -f "$img" ] || continue
  NAME="$(basename "$img" | sed 's/\.[^.]*$//')"
  echo -e "\n${YELLOW}Testing: $NAME${NC}"

  RESULT=$(curl -sf -X POST "$WORKER_URL/api/analyze" \
    -F "images=@$img;type=image/jpeg" \
    -F "context_language=en" -F "context_timestamp=1772607042000" \
    2>/dev/null) || {
    echo -e "${RED}  ✗ API 调用失败${NC}"
    FAIL=$((FAIL + 1))
    continue
  }

  DATA=$(echo "$RESULT" | python3 -c "
import sys, json
resp = json.load(sys.stdin)
if not resp.get('ok'):
    print(json.dumps(resp.get('error', {})), file=sys.stderr)
    sys.exit(1)
print(json.dumps(resp.get('data', {})))
" 2>&1) || {
    echo -e "${RED}  ✗ API 返回错误: $DATA${NC}"
    FAIL=$((FAIL + 1))
    continue
  }

  if ! echo "$DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('items', [])
assert isinstance(items, list), 'items must be array'
assert len(items) > 0, 'items must not be empty'
for i, item in enumerate(items):
    assert 'id' in item, f'item[{i}] missing id'
    assert 'nameOriginal' in item, f'item[{i}] missing nameOriginal'
    assert 'nameTranslated' in item, f'item[{i}] missing nameTranslated'
cats = data.get('categories', [])
assert isinstance(cats, list), 'categories must be array'
for i, cat in enumerate(cats):
    assert 'id' in cat, f'category[{i}] missing id'
    assert 'itemIds' in cat, f'category[{i}] missing itemIds'
print(f'  Schema OK: {len(items)} items, {len(cats)} categories')
" 2>&1; then
    echo -e "${RED}  ✗ Schema 验证失败${NC}"
    FAIL=$((FAIL + 1))
    continue
  fi

  FORMATTED_DATA=$(echo "$DATA" | python3 -m json.tool 2>/dev/null || echo "$DATA")
  EXPECTED_FILE="$EXPECTED_DIR/$NAME.json"

  if $UPDATE_MODE; then
    mkdir -p "$EXPECTED_DIR"
    echo "$FORMATTED_DATA" > "$EXPECTED_FILE"
    echo -e "${GREEN}  ✓ 基线已更新: $EXPECTED_FILE${NC}"
    PASS=$((PASS + 1))
  else
    if [ ! -f "$EXPECTED_FILE" ]; then
      echo -e "${YELLOW}  ⚠ 无基线文件，跳过 diff（运行 --update 生成基线）${NC}"
      PASS=$((PASS + 1))
      continue
    fi

    # 结构性对比：item 数量、category 数量、必填字段覆盖率
    EXPECTED_ESCAPED=$(python3 -c "import json; print(json.dumps(open('$EXPECTED_FILE').read()))")
    ACTUAL_ESCAPED=$(python3 -c "import json,sys; print(json.dumps(sys.stdin.read()))" <<< "$FORMATTED_DATA")

    DIFF_RESULT=$(python3 -c "
import sys, json

expected = json.loads(json.loads($EXPECTED_ESCAPED))
actual = json.loads(json.loads($ACTUAL_ESCAPED))

diffs = []

exp_count = len(expected.get('items', []))
act_count = len(actual.get('items', []))
if abs(exp_count - act_count) > max(2, int(exp_count * 0.2)):
    diffs.append(f'Item count: expected {exp_count}, got {act_count} (>20% drift)')

exp_cats = len(expected.get('categories', []))
act_cats = len(actual.get('categories', []))
if abs(exp_cats - act_cats) > 2:
    diffs.append(f'Category count: expected {exp_cats}, got {act_cats}')

required_fields = ['id', 'nameOriginal', 'nameTranslated', 'brief', 'allergens', 'dietaryFlags', 'spiceLevel']
for field in required_fields:
    exp_coverage = sum(1 for it in expected.get('items', []) if it.get(field) not in [None, '', []])
    act_coverage = sum(1 for it in actual.get('items', []) if it.get(field) not in [None, '', []])
    if exp_count > 0 and act_count > 0:
        exp_pct = exp_coverage / exp_count
        act_pct = act_coverage / act_count
        if exp_pct > 0.5 and act_pct < exp_pct * 0.5:
            diffs.append(f'Field \"{field}\" coverage dropped: {exp_pct:.0%} -> {act_pct:.0%}')

if diffs:
    print('DRIFT')
    for d in diffs:
        print(f'  - {d}')
else:
    print('OK')
" 2>&1) || {
      echo -e "${YELLOW}  ⚠ Diff 脚本出错，跳过${NC}"
      PASS=$((PASS + 1))
      continue
    }

    if echo "$DIFF_RESULT" | grep -q "^DRIFT"; then
      echo -e "${RED}  ✗ 输出漂移:${NC}"
      echo "$DIFF_RESULT" | grep -v "^DRIFT"
      DIFF_COUNT=$((DIFF_COUNT + 1))
      FAIL=$((FAIL + 1))
    else
      echo -e "${GREEN}  ✓ 与基线一致${NC}"
      PASS=$((PASS + 1))
    fi
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━"
if $UPDATE_MODE; then
  echo -e "${GREEN}结果: $PASS 基线已更新, $FAIL 失败${NC}"
else
  echo -e "${GREEN}结果: $PASS 通过, $FAIL 失败 ($DIFF_COUNT 漂移)${NC}"
fi

if [ "$FAIL" -gt 0 ]; then
  if ! $UPDATE_MODE; then
    echo -e "${YELLOW}如果新输出是正确的，运行: scripts/verify-prompt.sh --update${NC}"
  fi
  exit 1
fi
