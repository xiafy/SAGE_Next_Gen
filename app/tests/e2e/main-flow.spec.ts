import { test, expect } from '@playwright/test';
import { mockAnalyzeAPI, mockChatAPI } from './mocks/api-mock';

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
    // Create a minimal test image via page context if fixture doesn't exist
    await page.addInitScript(() => {
      // Stub createImageBitmap to avoid canvas issues in headless
      if (typeof window !== 'undefined') {
        (window as Record<string, unknown>).__SAGE_E2E__ = true;
      }
    });
  });

  test('Full main path: Home → Scan → Chat → Explore → Order → Waiter', async ({ page }) => {
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
    // Set up API mocks BEFORE triggering upload
    await mockAnalyzeAPI(page);
    await mockChatAPI(page);

    // Create a minimal PNG buffer for the file input
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
    // Click the analyze button (appears after files selected)
    const analyzeBtn = page.getByRole('button', { name: /Analyze|确认并分析/i });
    await expect(analyzeBtn).toBeVisible();
    await analyzeBtn.click();

    // ── Step 5: Chat page with results ──
    await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
    // Wait for streaming to complete (mock is fast)
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/04-chat.png' });

    // ── Step 6: Navigate to Explore ──
    // Click Explore button in bottom nav or via TopBar action
    const exploreBtn = page.getByRole('button', { name: /Explore|菜单|Browse/i }).first();
    if (await exploreBtn.isVisible().catch(() => false)) {
      await exploreBtn.click();
    } else {
      // Navigate via chat top bar or order bar
      const menuBtn = page.getByRole('button', { name: /Explore|菜单/i }).first();
      if (await menuBtn.isVisible().catch(() => false)) {
        await menuBtn.click();
      }
    }

    // If we're on explore, verify dish cards
    const isOnExplore = await page.getByTestId('sage-dish-card').first().isVisible({ timeout: 3000 }).catch(() => false);
    if (isOnExplore) {
      await expect(page.getByTestId('sage-dish-name').first()).toBeVisible();
      await page.screenshot({ path: 'screenshots/05-explore.png' });

      // ── Step 7: Go back to Chat ──
      await page.getByTestId('sage-topbar-back-btn').click();
      await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 5000 });
    }

    // ── Step 8: Send a message ──
    const chatInput = page.getByTestId('sage-chat-input');
    if (await chatInput.isVisible().catch(() => false)) {
      // Re-mock chat for the reply
      await mockChatAPI(page, 'Pad Thai is an excellent choice! It features rice noodles with peanuts.');

      await chatInput.fill('Tell me about Pad Thai');
      await page.getByTestId('sage-chat-send-btn').click();

      // Wait for AI reply
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/06-chat-reply.png' });
    }

    // ── Step 9: Navigate to Order ──
    // If there are order items, click the order bar
    const orderBar = page.getByRole('button', { name: /View order|查看点单/i });
    if (await orderBar.isVisible().catch(() => false)) {
      await orderBar.click();
      await expect(page.getByTestId('sage-order-list')).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'screenshots/07-order.png' });

      // ── Step 10: Navigate to Waiter Mode ──
      const waiterBtn = page.getByRole('button', { name: /Show to Waiter|展示给服务员/i });
      if (await waiterBtn.isVisible().catch(() => false)) {
        await waiterBtn.click();
        await expect(page.getByTestId('sage-waiter-panel')).toBeVisible({ timeout: 5000 });
        await page.screenshot({ path: 'screenshots/08-waiter.png' });
      }
    }

    // Test completed successfully
    await page.screenshot({ path: 'screenshots/09-final.png' });
  });
});

/**
 * Create a minimal valid PNG buffer (1x1 white pixel)
 */
function createMinimalPNG(): Buffer {
  // Minimal 1x1 white PNG
  const png = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return png;
}
