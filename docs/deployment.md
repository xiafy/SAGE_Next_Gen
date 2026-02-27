# DEPLOYMENT.md — 部署方案

> 版本: v1.0
> 日期: 2026-02-26
> 状态: ✅ 完整版（含 CI/CD、环境管理、Secret 管理、回滚策略）
> 上游文档: `docs/architecture.md`、`docs/tech-stack.md`

---

## 一、部署架构总览

```
GitHub Repository
├── main 分支
│   ├── push → Cloudflare Pages CI (前端)
│   └── push → GitHub Actions → wrangler deploy (Worker)
│
└── dev/* 分支
    └── push → Preview 环境（Pages Preview URL）
```

**两个独立部署单元**：

| 单元 | 平台 | 触发方式 | 域名 |
|------|------|---------|------|
| 前端 SPA | Cloudflare Pages | Git push | `sage-next-gen.pages.dev` |
| API Worker | Cloudflare Workers | GitHub Actions | `sage-worker.{account}.workers.dev` |

---

## 二、环境定义

| 环境 | 用途 | 前端 URL | Worker URL |
|------|------|---------|-----------|
| `local` | 本地开发 | `http://localhost:5173` | `http://localhost:8787` |
| `preview` | PR / 功能分支预览 | `https://{branch}.sage-next-gen.pages.dev` | 使用 production Worker |
| `production` | 正式上线 | `https://sage-next-gen.pages.dev` | `https://sage-worker.{account}.workers.dev` |

> **注**: Preview 环境目前共用 production Worker（简化运维），后续如需隔离可增设 staging Worker。

---

## 三、前端部署（Cloudflare Pages）

### 3.1 配置

Cloudflare Pages 项目设置（Dashboard 手动配置一次）：

```
Project name: sage-next-gen
Production branch: main
Build command: pnpm build
Build output directory: dist
Root directory: app
Node.js version: 22
```

### 3.2 自动部署流程

```
1. 开发者 push to main
2. CF Pages 检测到变更，自动拉取代码
3. 执行 pnpm build（Vite 构建）
4. 上传 dist/ 到 CF CDN（全球边缘节点）
5. 域名 sage-next-gen.pages.dev 指向新版本
6. 构建失败 → 自动回滚到上一个成功部署
```

### 3.3 前端环境变量

```bash
# CF Pages → Settings → Environment Variables
VITE_API_BASE_URL=/api       # 相对路径（同域，无需跨域）
VITE_APP_VERSION=1.0.0       # 构建时注入（CI 自动设置）
```

> ⚠️ 前端不得存放任何 API Key，所有敏感变量只在 Worker 侧。

---

## 四、Worker 部署（Cloudflare Workers）

### 4.1 `wrangler.toml`

```toml
name = "sage-worker"
main = "worker/index.ts"
compatibility_date = "2024-09-23"

[build]
command = "pnpm build:worker"

[vars]
ENVIRONMENT = "production"
APP_VERSION = "1.0.0"      # CI 注入

# Secrets（不在 wrangler.toml 中，通过 wrangler secret put 设置）
# BAILIAN_API_KEY

[[routes]]
pattern = "sage-next-gen.pages.dev/api/*"
zone_name = "pages.dev"
```

### 4.2 Secret 管理

```bash
# 首次配置（只需执行一次）
wrangler secret put BAILIAN_API_KEY
# 输入: sk-26f92cb93b2c4f0ea68e4b5c8adb9bbf

# 查看已配置的 secrets（只显示名称，不显示值）
wrangler secret list

# 更新 key（重新 put 即可覆盖）
wrangler secret put BAILIAN_API_KEY
```

**Secret 安全规则**：
- ❌ 不得在代码中硬编码
- ❌ 不得提交到 Git（`.gitignore` 覆盖 `.env*`）
- ❌ 不得写入任何项目文档（含本文档）
- ✅ 只通过 `wrangler secret put` 设置
- ✅ Worker 通过 `env.BAILIAN_API_KEY` 访问

### 4.3 GitHub Actions CI/CD（Worker 部署）

```yaml
# .github/workflows/deploy-worker.yml
name: Deploy Worker

on:
  push:
    branches: [main]
    paths:
      - 'worker/**'
      - 'wrangler.toml'

jobs:
  deploy:
    name: Deploy to Cloudflare Workers
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Deploy Worker
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          accountId: ${{ secrets.CF_ACCOUNT_ID }}
          command: deploy --env production

      - name: Smoke Test
        run: |
          sleep 10
          curl -f https://sage-worker.{account}.workers.dev/api/health \
            || (echo "Health check failed!" && exit 1)
```

**GitHub Secrets 配置**（仓库 Settings → Secrets）：
```
CF_API_TOKEN     # Cloudflare API Token（Workers:Edit 权限）
CF_ACCOUNT_ID    # a8a991250287ac8543cef3e5cf773c3e
```

---

## 五、本地开发环境搭建

### 5.1 前置要求

```bash
# 检查版本
node --version    # >= 22
pnpm --version    # >= 9
wrangler --version # >= 3.0
```

### 5.2 首次搭建

```bash
# 1. 克隆仓库
git clone https://github.com/xiafy/SAGE_Next_Gen
cd SAGE_Next_Gen/app

# 2. 安装依赖
pnpm install

# 3. 配置本地 Worker Secret
# 创建 .dev.vars 文件（被 .gitignore 忽略）
cat > worker/.dev.vars << EOF
BAILIAN_API_KEY=sk-your-key-here
ENVIRONMENT=local
EOF

# 4. 同时启动前端 + Worker
pnpm dev          # 终端 1：Vite 开发服务器 → localhost:5173
pnpm worker:dev   # 终端 2：Wrangler 本地 Worker → localhost:8787
```

### 5.3 `.gitignore` 关键条目

```gitignore
# 环境变量和密钥
.env
.env.*
.dev.vars
worker/.dev.vars

# 构建产物
dist/
.wrangler/

# 依赖
node_modules/
```

---

## 六、发布流程（SOP）

### 6.1 日常功能发布

```bash
# 1. 在 feature 分支开发
git checkout -b feat/dish-card-ui

# 2. 开发完成，本地测试通过
pnpm test
pnpm test:e2e

# 3. 创建 PR → main
# CF Pages 自动生成 Preview URL（预览验证）

# 4. Mr. Xia / 开发者 Code Review + 预览验证

# 5. Merge to main
# → CF Pages 自动构建 + 部署前端
# → GitHub Actions 自动部署 Worker

# 6. 生产验证（Smoke Test）
curl https://sage-next-gen.pages.dev        # 前端可访问
curl https://sage-next-gen.pages.dev/api/health  # Worker 健康
```

### 6.2 紧急修复（Hotfix）

```bash
# 1. 从 main 创建 hotfix 分支
git checkout -b hotfix/fix-analyze-crash main

# 2. 最小化修复
# 3. 直接 PR → main（跳过完整测试，用 Smoke Test 代替）
# 4. Merge + 自动部署
# 5. 观察 15 分钟确认无异常
```

---

## 七、回滚策略

### 7.1 前端回滚

Cloudflare Pages 保留所有历史部署，可在 Dashboard 一键回滚：

```
CF Dashboard → Pages → sage-next-gen → Deployments
→ 找到上一个稳定版本 → Rollback to this deployment
```

**预计回滚时间**: < 1 分钟（切换 CDN 指向）

### 7.2 Worker 回滚

```bash
# 查看历史版本
wrangler deployments list

# 回滚到指定版本
wrangler rollback {deployment-id}

# 或直接重新部署上一个稳定 commit
git revert HEAD
git push
```

**预计回滚时间**: < 2 分钟

---

## 八、监控与告警（MVP 基础配置）

### 8.1 Cloudflare Workers 内置监控

CF Dashboard → Workers → sage-worker → Analytics：
- 请求量、错误率、P50/P95/P99 延迟
- 告警规则（免费套餐支持 Email 告警）：
  - 错误率 > 5% → 发送 Email

### 8.2 健康检查

```bash
# 部署后 Smoke Test 脚本
#!/bin/bash
BASE_URL="https://sage-next-gen.pages.dev"

# 前端可访问性
curl -f "$BASE_URL" -o /dev/null -s -w "Frontend: %{http_code}\n"

# Worker 健康检查
curl -f "$BASE_URL/api/health" -s | python3 -c "
import json, sys
data = json.load(sys.stdin)
assert data['ok'] == True
assert data['data']['status'] == 'healthy'
print('Worker: healthy')
"
```

### 8.3 MVP 阶段不实施的监控

以下监控在 MVP 阶段暂不实施（复杂度 vs. 收益不匹配）：
- Sentry 错误追踪（Sprint 2+ 引入）
- 自定义 Dashboard（CF Analytics 够用）
- 全链路 Trace（OpenTelemetry，Sprint 3+）

---

## 九、成本预估（MVP 阶段）

### 9.1 Cloudflare 费用

| 服务 | 免费额度 | MVP 预估用量 | 费用 |
|------|---------|------------|------|
| Pages | 500 构建/月 | ~50 构建/月 | 免费 |
| Workers | 100K 请求/天 | ~1K 请求/天 | 免费 |
| KV（速率限制）| 100K 读/天 | ~1K/天 | 免费 |

### 9.2 阿里云百炼费用（估算）

> 以 Beta 阶段 20 个种子用户、每用户每天 3 次使用为基准：

| 场景 | 调用次数/天 | 模型 | 预估费用 |
|------|-----------|------|---------|
| 菜单识别 | 60 次/天 | Qwen3-VL-Plus | 参考官网定价 |
| AI 对话 | 300 次/天 | Qwen3.5-Plus | 参考官网定价 |

> 具体价格以 [百炼官网定价页](https://www.aliyun.com/price/product#/dashscope/detail) 为准。Beta 阶段费用预计极低（< ¥100/月）。

---

## 十、域名规划

| 阶段 | 域名 | 说明 |
|------|------|------|
| MVP Beta | `sage-next-gen.pages.dev` | CF Pages 默认域名，无需购买 |
| 正式上线 | `sage.app`（待定）| 需购买域名，CF 托管 DNS |
| 候选方案 | `trysage.app` / `usesage.app` | 备选域名 |

> 域名购买决策延后至 M4（公测上线）阶段。

---

*文档版本 v1.0，由 SAGE Agent 起草，供 Mr. Xia 审阅。*
