import { test, expect } from '@playwright/test';
import { mockAnalyzeAPI, mockChatAPI } from './mocks/api-mock';
import { createMinimalPNG } from './helpers/test-utils';

/**
 * SAGE E2E Main Flow Test
 *
 * Home -> Scan -> Upload -> (API mock) -> Chat -> Explore -> Back ->
 * Send message -> AI reply -> Order -> Waiter Mode -> End
 *
 * All API calls are mocked — runs offline in <30s.
 */

test.describe('Main Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (typeof window !== 'undefined') {
        (window as Record<string, unknown>).__SAGE_E2E__ = true;
      }
    });
  });

  test('Full main path: Home -> Scan -> Chat -> Explore -> Order -> Waiter', async ({ page }) => {
    // ── Step 1: Home page ──
    await page.goto('/');
    await expect(page.getByTestId('sage-home-greeting')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('sage-home-scan-btn')).toBeVisible();
    await page.screenshot({ path: 'screenshots/01-home.png' });

    // ── Step 2: Navigate to Scanner ──
    await page.getByTestId('sage-home-scan-btn').click();
    await expect(page.getByTestId('sage-topbar')).toBeVisible();
    await expect(page.getByTestId('sage-scanner-upload-btn')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/02-scanner.png' });

    // ── Step 3: Upload image (mock file chooser) ──
    await mockAnalyzeAPI(page);
    await mockChatAPI(page);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-menu.png',
      mimeType: 'image/png',
      buffer: createMinimalPNG(),
    });

    // Preview should appear
    await expect(page.getByTestId('sage-scanner-preview')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/03-scanner-preview.png' });

    // ── Step 4: Confirm and analyze ──
    const analyzeBtn = page.getByRole('button', { name: /Analyze|确认并分析/i });
    await expect(analyzeBtn).toBeVisible();
    await analyzeBtn.click();

    // ── Step 5: Chat page with results ──
    await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
    // Wait for at least one chat bubble to confirm streaming completed
    await expect(page.getByTestId('sage-chat-bubble').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/04-chat.png' });

    // ── Step 6: Navigate to Explore ──
    const exploreBtn = page.getByRole('button', { name: /Explore|菜单|Browse/i }).first();
    await expect(exploreBtn).toBeVisible({ timeout: 5000 });
    await exploreBtn.click();

    // Verify dish cards rendered
    await expect(page.getByTestId('sage-dish-card').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('sage-dish-name').first()).toBeVisible();
    await page.screenshot({ path: 'screenshots/05-explore.png' });

    // ── Step 7: Go back to Chat ──
    await page.getByTestId('sage-topbar-back-btn').click();
    await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 5000 });

    // ── Step 8: Send a message ──
    const chatInput = page.getByTestId('sage-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 5000 });

    // Re-mock chat for the reply
    await mockChatAPI(page, 'Pad Thai is an excellent choice! It features rice noodles with peanuts.');

    await chatInput.fill('Tell me about Pad Thai');
    await page.getByTestId('sage-chat-send-btn').click();

    // Wait for AI reply bubble to appear
    await expect(async () => {
      const count = await page.getByTestId('sage-chat-bubble').count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/06-chat-reply.png' });

    // ── Step 9: Navigate to Order ──
    const orderBar = page.getByRole('button', { name: /View order|查看点单/i });
    await expect(orderBar).toBeVisible({ timeout: 5000 });
    await orderBar.click();
    await expect(page.getByTestId('sage-order-list')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/07-order.png' });

    // ── Step 10: Navigate to Waiter Mode ──
    const waiterBtn = page.getByRole('button', { name: /Show to Waiter|展示给服务员/i });
    await expect(waiterBtn).toBeVisible({ timeout: 5000 });
    await waiterBtn.click();
    await expect(page.getByTestId('sage-waiter-panel')).toBeVisible({ timeout: 5000 });
    await page.screenshot({ path: 'screenshots/08-waiter.png' });

    // Test completed successfully
    await page.screenshot({ path: 'screenshots/09-final.png' });
  });
});
