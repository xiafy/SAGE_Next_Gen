# TASK: Playwright E2E 冒烟测试

## 背景
SAGE 是一个餐饮智能体 Web App（Vite + React + Tailwind v4）。目录结构：
- `app/` — 前端（Vite + React）
- `worker/` — Cloudflare Worker

## 任务目标
在 `app/` 目录下搭建 Playwright E2E 冒烟测试，覆盖核心 UI 导航路径（不测试真实 API）。

## T1: 先读源码，理解 UI 结构
读以下文件，了解按钮文字和 aria-label：
- `app/src/views/HomeView.tsx`
- `app/src/views/ScannerView.tsx`
- `app/src/views/SettingsView.tsx`
- `app/src/App.tsx`

## T2: 安装 Playwright
```bash
cd app
npm install -D @playwright/test
npx playwright install chromium
```

## T3: 创建 Playwright 配置
创建 `app/playwright.config.ts`:
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    ...devices['iPhone 14 Pro'],
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'chromium', use: { ...devices['iPhone 14 Pro'] } },
  ],
});
```

## T4: 编写冒烟测试
创建 `app/tests/e2e/smoke.spec.ts`，包含以下 5 个测试（先读源码确认 aria-label 和文字）：

1. **Home 页面加载** — 看到 "SAGE" 标题、扫描菜单按钮、设置图标
2. **Home → Scanner 导航** — 点击扫描按钮，进入 Scanner 界面
3. **Home → Settings 导航** — 点击设置图标，进入 Settings 页面
4. **Settings 语言切换** — 切换语言，验证 UI 文字变化
5. **Scanner → 返回 Home** — 进入 Scanner，点击返回，回到 Home

注意：
- 使用语义定位器（getByRole, getByText, getByLabel）
- 不 mock API，不测试菜单识别/AI对话
- 根据实际源码中的文字/aria-label 来写选择器

## T5: 添加 npm scripts
在 `app/package.json` 的 scripts 里加：
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

## T6: 运行测试
```bash
cd app
npx playwright test
```
如果有失败，修复测试代码（不改应用代码），直到全部通过。

## T7: 更新项目文档
在 `PROGRESS.md` 末尾追加：
```
## Sprint 2 Tasks
- [x] Task #7: Playwright E2E 冒烟测试（5个用例，全部通过）
```

## 完成信号
所有测试通过后，输出：TASK_DONE

When completely finished, run:
openclaw system event --text "Task7 Done: Playwright E2E 5 smoke tests all passing" --mode now
