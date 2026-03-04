#!/usr/bin/env bash
set -euo pipefail

# Prompt 变更验证脚本
# 用法: scripts/verify-prompt.sh [worker-url]
# 默认: http://localhost:8787

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

WORKER_URL="${1:-http://localhost:8787}"
FIXTURE_DIR="tests/fixtures"
EXPECTED_DIR="$FIXTURE_DIR/expected"

echo -e "${GREEN}▶ Prompt 验证${NC}"
echo "  Worker: $WORKER_URL"
echo "  Fixtures: $FIXTURE_DIR"

# 检查 Worker 是否可达
if ! curl -sf "$WORKER_URL/api/health" > /dev/null 2>&1; then
  echo -e "${RED}✗ Worker 不可达: $WORKER_URL${NC}"
  echo "  请先启动: cd worker && npx wrangler dev --port 8787"
  exit 1
fi

PASS=0
FAIL=0

for img in "$FIXTURE_DIR"/*.jpg "$FIXTURE_DIR"/*.png; do
  [ -f "$img" ] || continue
  NAME="$(basename "$img" | sed 's/\.[^.]*$//')"
  echo -e "\n${YELLOW}Testing: $NAME${NC}"

  # 调用 analyze API（multipart, field name = images）
  RESULT=$(curl -sf -X POST "$WORKER_URL/api/analyze" \
    -F "images=@$img;type=image/jpeg" \
    -F "context_language=en" -F "context_timestamp=1772607042000" \
    2>/dev/null) || {
    echo -e "${RED}  ✗ API 调用失败${NC}"
    FAIL=$((FAIL + 1))
    continue
  }

  # 从响应中提取 data
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

  # Schema 验证
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
print(f'OK: {len(items)} items, {len(cats)} categories')
" 2>&1; then
    echo -e "${RED}  ✗ Schema 验证失败${NC}"
    FAIL=$((FAIL + 1))
    continue
  fi

  # 保存结果供对比
  mkdir -p "$EXPECTED_DIR"
  echo "$DATA" | python3 -m json.tool > "$EXPECTED_DIR/$NAME.json" 2>/dev/null || true

  echo -e "${GREEN}  ✓ 通过${NC}"
  PASS=$((PASS + 1))
done

echo -e "\n${GREEN}结果: $PASS 通过, $FAIL 失败${NC}"
[ "$FAIL" -eq 0 ] || exit 1
