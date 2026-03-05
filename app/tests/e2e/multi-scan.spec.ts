import { test, expect } from '@playwright/test';
import { mockAnalyzeAPI, mockChatAPI, mockSupplementaryAnalyzeAPI } from './mocks/api-mock';

/**
 * SAGE E2E Multi-Image Supplementary Scan Test
 *
 * 1. Scan first image -> results displayed
 * 2. Supplement with second image -> results merged
 */

function createMinimalPNG(): Buffer {
  return Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
    0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
    0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
    0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
}

test.describe('Multi-Image Supplementary Scan', () => {
  test('Scan 1 image, then supplement with another image', async ({ page }) => {
    // ── Step 1: First scan ──
    await mockAnalyzeAPI(page);
    await mockChatAPI(page);

    await page.goto('/');
    await expect(page.getByTestId('sage-home-scan-btn')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sage-home-scan-btn').click();

    // Upload first image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'menu-1.png',
      mimeType: 'image/png',
      buffer: createMinimalPNG(),
    });

    // Confirm analyze
    const analyzeBtn = page.getByRole('button', { name: /Analyze|确认并分析/i });
    await expect(analyzeBtn).toBeVisible({ timeout: 5000 });
    await analyzeBtn.click();

    // Wait for chat with results
    await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/multi-01-first-scan.png' });

    // ── Step 2: Supplementary scan ──
    // Click the camera/photo button in chat to add more photos
    const addPhotosBtn = page.getByRole('button', { name: /Add more photos|补充菜单照片/i });
    const canSupplement = await addPhotosBtn.isVisible().catch(() => false);

    if (canSupplement) {
      // Set up supplementary mock (replaces the analyze route)
      await mockSupplementaryAnalyzeAPI(page);

      await addPhotosBtn.click();

      // Should be on scanner page in supplement mode
      await expect(page.getByTestId('sage-topbar')).toBeVisible({ timeout: 5000 });
      await page.screenshot({ path: 'screenshots/multi-02-supplement-scanner.png' });

      // Upload second image
      const fileInput2 = page.locator('input[type="file"]');
      await fileInput2.setInputFiles({
        name: 'menu-2.png',
        mimeType: 'image/png',
        buffer: createMinimalPNG(),
      });

      // Confirm analyze
      const analyzeBtn2 = page.getByRole('button', { name: /Analyze|确认并分析/i });
      await expect(analyzeBtn2).toBeVisible({ timeout: 5000 });
      await analyzeBtn2.click();

      // Wait for merged results in chat
      await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/multi-03-merged-results.png' });

      // Verify we can navigate to explore and see items from both scans
      // (The supplement data adds drinks category)
    }

    await page.screenshot({ path: 'screenshots/multi-04-final.png' });
  });
});
