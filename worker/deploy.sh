#!/bin/bash
# SAGE Worker 一键部署脚本
# 使用前提：已有 Cloudflare 账号 + BAILIAN_API_KEY

set -e

echo "🚀 SAGE Worker 部署开始..."
echo ""

# Step 1: 登录
echo "Step 1/3: Cloudflare 登录（浏览器会自动打开）"
npx wrangler login

echo ""
echo "Step 2/3: 设置 BAILIAN_API_KEY（请粘贴你的百炼 API Key）"
npx wrangler secret put BAILIAN_API_KEY

echo ""
echo "Step 3/3: 部署 Worker..."
npx wrangler deploy

echo ""
echo "✅ Worker 部署完成！"
echo "Worker URL: https://sage-worker.<你的CF子域>.workers.dev"
echo ""
echo "下一步：在 Cloudflare Dashboard 创建 Pages 项目 sage-next-gen"
echo "  1. 访问 https://dash.cloudflare.com/"
echo "  2. Pages → Create a project → Connect to Git"
echo "  3. 选择 sage-next-gen repo，Framework: Vite"
echo "  4. Build command: npm run build"
echo "  5. Build output: dist"
echo "  6. 环境变量：VITE_WORKER_URL = <Worker URL from above>"
