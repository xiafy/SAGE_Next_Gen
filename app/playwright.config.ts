import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    // iPhone 14 Pro viewport, but run with chromium
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 60000,
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: {
        browserName: 'chromium',
      },
    },
  ],
});
