import { test, expect } from '@playwright/test';
import { mockAnalyzeAPI, mockChatAPI, mockSupplementaryAnalyzeAPI } from './mocks/api-mock';
import { createMinimalPNG } from './helpers/test-utils';

/**
 * SAGE E2E Multi-Image Supplementary Scan Test
 *
 * 1. Scan first image -> results displayed
 * 2. Supplement with second image -> results merged
 */

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

    // Wait for chat with results — at least one bubble rendered
    await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('sage-chat-bubble').first()).toBeVisible({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/multi-01-first-scan.png' });

    // ── Step 2: Supplementary scan ──
    // Click the camera/photo button in chat to add more photos
    const addPhotosBtn = page.getByRole('button', { name: /Add more photos|补充菜单照片/i });
    await expect(addPhotosBtn).toBeVisible({ timeout: 5000 });

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

    // Wait for merged results in chat — a new bubble should appear
    await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
    await expect(async () => {
      const count = await page.getByTestId('sage-chat-bubble').count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });
    await page.screenshot({ path: 'screenshots/multi-03-merged-results.png' });

    await page.screenshot({ path: 'screenshots/multi-04-final.png' });
  });
});
