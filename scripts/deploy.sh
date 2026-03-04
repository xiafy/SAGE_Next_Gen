#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

# ── Usage ──
usage() {
  echo "Usage: scripts/deploy.sh <target> [options]"
  echo ""
  echo "Targets:"
  echo "  app      Deploy frontend to sage-next-gen.pages.dev"
  echo "  worker   Deploy API to sage-worker.xiafy920.workers.dev"
  echo "  all      Deploy both"
  echo ""
  echo "Options:"
  echo "  --force  Skip all quality gates (emergency hotfix only)"
  echo "  --tag    Create git tag after deploy"
  echo ""
  echo "Environment:"
  echo "  CLOUDFLARE_API_TOKEN  Required (set before running)"
  exit 1
}

# ── Parse args ──
if [ $# -lt 1 ]; then
  usage
fi

TARGET="$1"
shift

FORCE=false
DO_TAG=false

while [ $# -gt 0 ]; do
  case "$1" in
    --force) FORCE=true ;;
    --tag) DO_TAG=true ;;
    *) echo -e "${RED}Unknown option: $1${NC}"; usage ;;
  esac
  shift
done

case "$TARGET" in
  app|worker|all) ;;
  *) echo -e "${RED}Invalid target: $TARGET (must be app/worker/all)${NC}"; usage ;;
esac

# ── Environment check (never skipped, even with --force) ──
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo -e "${RED}ERROR: CLOUDFLARE_API_TOKEN not set${NC}"
  echo "  export CLOUDFLARE_API_TOKEN=your_token"
  exit 1
fi
export CLOUDFLARE_ACCOUNT_ID="a8a991250287ac8543cef3e5cf773c3e"

# ── Force bypass ──
if $FORCE; then
  echo -e "${RED}⚠️⚠️⚠️  FORCE DEPLOY — ALL QUALITY GATES BYPASSED  ⚠️⚠️⚠️${NC}"
  echo "[FORCE DEPLOY] $(date -u +%Y-%m-%dT%H:%M:%SZ) target=$TARGET user=$(whoami) commit=$(git rev-parse --short HEAD)" >> "$REPO_ROOT/.force-deploy.log"
  echo -e "${YELLOW}Skipping compile, tests, and git checks.${NC}"
else
  # ── L1: TypeScript compile ──
  echo -e "\n${GREEN}▶ [1/4] TypeScript compile${NC}"

  if [ "$TARGET" = "app" ] || [ "$TARGET" = "all" ]; then
    echo "  → app/ typecheck..."
    if ! ( cd "$REPO_ROOT/app" && npx tsc --noEmit ); then
      echo -e "${RED}✗ app/ typecheck FAILED. Fix errors before deploying.${NC}"
      exit 1
    fi
    echo -e "${GREEN}  ✓ app/ typecheck passed${NC}"
  fi

  if [ "$TARGET" = "worker" ] || [ "$TARGET" = "all" ]; then
    echo "  → worker/ typecheck..."
    if ! ( cd "$REPO_ROOT/worker" && npx tsc --noEmit ); then
      echo -e "${RED}✗ worker/ typecheck FAILED. Fix errors before deploying.${NC}"
      exit 1
    fi
    echo -e "${GREEN}  ✓ worker/ typecheck passed${NC}"
  fi

  # ── L2: Unit tests ──
  echo -e "\n${GREEN}▶ [2/4] Unit tests${NC}"
  if [ "$TARGET" = "app" ] || [ "$TARGET" = "all" ]; then
    echo "  → app/ vitest run..."
    if ! ( cd "$REPO_ROOT/app" && npx vitest run ); then
      echo -e "${RED}✗ App tests FAILED. Fix failing tests before deploying.${NC}"
      exit 1
    fi
    echo -e "${GREEN}  ✓ App tests passed${NC}"
  fi
  if [ "$TARGET" = "worker" ] || [ "$TARGET" = "all" ]; then
    if [ -f "$REPO_ROOT/worker/package.json" ] && grep -q test "$REPO_ROOT/worker/package.json" 2>/dev/null; then
      echo "  → worker/ vitest run..."
      if ! ( cd "$REPO_ROOT/worker" && npx vitest run ); then
        echo -e "${RED}✗ Worker tests FAILED.${NC}"
        exit 1
      fi
      echo -e "${GREEN}  ✓ Worker tests passed${NC}"
    else
      echo -e "${YELLOW}  ⚠ Worker has no test script, skipping${NC}"
    fi
  fi

  # ── L3: Build (app only) ──
  if [ "$TARGET" = "app" ] || [ "$TARGET" = "all" ]; then
    echo -e "\n${GREEN}▶ [3/4] Build${NC}"
    echo "  → app/ npm run build..."
    if ! ( cd "$REPO_ROOT/app" && npm run build ); then
      echo -e "${RED}✗ Build FAILED.${NC}"
      exit 1
    fi
    echo -e "${GREEN}  ✓ Build passed${NC}"
  fi

  # ── L4: Git status (warnings, non-blocking) ──
  echo -e "\n${GREEN}▶ [4/4] Git status${NC}"
  if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}  ⚠️  Uncommitted changes detected${NC}"
  fi
  UNPUSHED="$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')"
  if [ "$UNPUSHED" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠️  $UNPUSHED unpushed commit(s)${NC}"
  fi
  if [ -z "$(git status --porcelain)" ] && [ "$UNPUSHED" -eq 0 ]; then
    echo -e "${GREEN}  ✓ Git clean, all pushed${NC}"
  fi
fi

# ── Deploy ──
echo -e "\n${GREEN}▶ Deploying...${NC}"

DEPLOY_RESULT=0

if [ "$TARGET" = "app" ] || [ "$TARGET" = "all" ]; then
  echo -e "${YELLOW}🚀 Deploying app → sage-next-gen.pages.dev${NC}"
  if ( cd "$REPO_ROOT/app" && npx wrangler pages deploy dist --project-name sage-next-gen ); then
    echo -e "${GREEN}✅ App deployed${NC}"
  else
    echo -e "${RED}✗ App deploy FAILED${NC}"
    DEPLOY_RESULT=1
  fi
fi

if [ "$TARGET" = "worker" ] || [ "$TARGET" = "all" ]; then
  echo -e "${YELLOW}🚀 Deploying worker → sage-worker.xiafy920.workers.dev${NC}"
  if ( cd "$REPO_ROOT/worker" && npx wrangler deploy ); then
    echo -e "${GREEN}✅ Worker deployed${NC}"
  else
    echo -e "${RED}✗ Worker deploy FAILED${NC}"
    DEPLOY_RESULT=1
  fi
fi

# ── Optional tag ──
if $DO_TAG && [ "$DEPLOY_RESULT" -eq 0 ]; then
  TAG_NAME="deploy/${TARGET}/$(date +%Y%m%d-%H%M%S)"
  git tag "$TAG_NAME"
  echo -e "${GREEN}🏷  Tagged: $TAG_NAME${NC}"
fi

if [ "$DEPLOY_RESULT" -ne 0 ]; then
  echo -e "\n${RED}✗ Deploy completed with errors${NC}"
  exit 1
fi

echo -e "\n${GREEN}✅ Deploy complete!${NC}"
