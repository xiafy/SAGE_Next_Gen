import { test, expect } from '@playwright/test';

/**
 * SAGE E2E Smoke Tests
 * 
 * Tests UI navigation only — no real API calls.
 * App defaults to English (en) in Playwright (no zh system locale).
 */

test.describe('Home', () => {
  test('T1: Home page loads correctly', async ({ page }) => {
    await page.goto('/');

    // SAGE branding visible
    await expect(page.getByRole('heading', { name: 'SAGE' })).toBeVisible();

    // Scan menu button visible
    await expect(page.getByRole('button', { name: /Scan Menu/i })).toBeVisible();

    // Settings icon visible
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('T2: Home → Scanner navigation', async ({ page }) => {
    await page.goto('/');

    // Click scan button
    await page.getByRole('button', { name: /Scan Menu/i }).click();

    // Should be on Scanner: back button is visible
    await expect(page.getByRole('button', { name: /Go back/i })).toBeVisible();

    // Scanner has Single/Multi toggle
    await expect(page.getByRole('button', { name: /Single/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Multi/i })).toBeVisible();
  });

  test('T3: Home → Settings navigation', async ({ page }) => {
    await page.goto('/');

    // Click settings icon
    await page.getByRole('button', { name: /Settings/i }).click();

    // Should be on Settings: close button and heading visible
    await expect(page.getByRole('button', { name: /Close settings/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Settings/i })).toBeVisible();

    // Language section visible
    await expect(page.getByRole('button', { name: '中文' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'English' })).toBeVisible();
  });

  test('T5: Scanner → Back → Home', async ({ page }) => {
    await page.goto('/');

    // Go to Scanner
    await page.getByRole('button', { name: /Scan Menu/i }).click();
    await expect(page.getByRole('button', { name: /Go back/i })).toBeVisible();

    // Go back
    await page.getByRole('button', { name: /Go back/i }).click();

    // Back on Home
    await expect(page.getByRole('heading', { name: 'SAGE' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Scan Menu/i })).toBeVisible();
  });
});

test.describe('Settings', () => {
  test('T4: Language switch zh ↔ en', async ({ page }) => {
    await page.goto('/');

    // Navigate to Settings
    await page.getByRole('button', { name: /Settings/i }).click();

    // Switch to Chinese
    await page.getByRole('button', { name: '中文' }).click();

    // Close settings - button label is now in Chinese
    await page.getByRole('button', { name: /关闭设置/i }).click();

    // Home should now show Chinese text
    await expect(page.getByRole('button', { name: /扫描菜单/i })).toBeVisible();

    // Go back to Settings and switch back to English
    await page.getByRole('button', { name: /设置/i }).click();
    await page.getByRole('button', { name: 'English' }).click();

    // Close settings - back to English
    await page.getByRole('button', { name: /Close settings/i }).click();

    // Home should show English again
    await expect(page.getByRole('button', { name: /Scan Menu/i })).toBeVisible();
  });
});
