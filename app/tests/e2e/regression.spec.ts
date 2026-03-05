import { test, expect } from '@playwright/test';
import { mockAnalyzeAPI, mockAnalyzeAPIError, mockChatAPIWithMealPlan, mockChatAPI, mockChatAPIError } from './mocks/api-mock';
import { createMinimalPNG } from './helpers/test-utils';

/**
 * SAGE E2E Regression Tests
 *
 * BUG-K: processAIResponse — MealPlan JSON correctly dispatches
 *        (chatPhase transitions from handing_off to chatting)
 * BUG-J: MealPlanCard renders in Chat view
 */

/** Helper: Go through scan flow to get to chat with menu data */
async function scanToChat(page: import('@playwright/test').Page) {
  await mockAnalyzeAPI(page);

  await page.goto('/');
  await expect(page.getByTestId('sage-home-scan-btn')).toBeVisible({ timeout: 10000 });
  await page.getByTestId('sage-home-scan-btn').click();

  // Upload image
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    name: 'test-menu.png',
    mimeType: 'image/png',
    buffer: createMinimalPNG(),
  });

  // Confirm analyze
  const analyzeBtn = page.getByRole('button', { name: /Analyze|确认并分析/i });
  await expect(analyzeBtn).toBeVisible({ timeout: 5000 });
  await analyzeBtn.click();

  // Wait for chat to load with results — at least one chat bubble rendered
  await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('sage-chat-bubble').first()).toBeVisible({ timeout: 10000 });
}

test.describe('BUG-K Regression: processAIResponse MealPlan dispatch', () => {
  test('Chat response with MealPlan JSON block renders MealPlanCard', async ({ page }) => {
    // Step 1: Get to chat with menu data
    await scanToChat(page);

    // Step 2: Mock chat API to return MealPlan JSON
    await mockChatAPIWithMealPlan(page);

    // Step 3: Send a message that triggers meal plan
    const chatInput = page.getByTestId('sage-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Please recommend a meal plan for 2 people');
    await page.getByTestId('sage-chat-send-btn').click();

    // Step 4: Verify MealPlanCard rendered (BUG-K fix: chatPhase transitions correctly)
    const mealPlanCard = page.getByTestId('sage-mealplan-card');
    await expect(mealPlanCard).toBeVisible({ timeout: 10000 });

    // BUG-J: Verify MealPlanCard has the "Add All to Order" button
    const addBtn = page.getByTestId('sage-mealplan-add-btn');
    await expect(addBtn).toBeVisible();

    await page.screenshot({ path: 'screenshots/regression-bugk-mealplan.png' });
  });
});

test.describe('BUG-J Regression: MealPlanCard in Chat', () => {
  test('MealPlanCard "Add All to Order" button updates order', async ({ page }) => {
    // Step 1: Get to chat with menu data
    await scanToChat(page);

    // Step 2: Mock chat API to return MealPlan JSON
    await mockChatAPIWithMealPlan(page);

    // Step 3: Trigger meal plan
    const chatInput = page.getByTestId('sage-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Suggest a meal plan');
    await page.getByTestId('sage-chat-send-btn').click();

    // Step 4: Wait for MealPlanCard
    const mealPlanCard = page.getByTestId('sage-mealplan-card');
    await expect(mealPlanCard).toBeVisible({ timeout: 10000 });

    // Step 5: Click "Add All to Order"
    const addBtn = page.getByTestId('sage-mealplan-add-btn');
    await addBtn.click();

    // Step 6: Verify order bar appears (items added)
    const orderBar = page.getByRole('button', { name: /items|道菜/i });
    await expect(orderBar).toBeVisible({ timeout: 5000 });

    await page.screenshot({ path: 'screenshots/regression-bugj-order-added.png' });
  });

  test('After MealPlan, user can still send messages (chatPhase = chatting)', async ({ page }) => {
    // Step 1: Get to chat with menu data
    await scanToChat(page);

    // Step 2: Mock chat API to return MealPlan JSON
    await mockChatAPIWithMealPlan(page);

    // Step 3: Trigger meal plan
    const chatInput = page.getByTestId('sage-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Suggest a meal plan');
    await page.getByTestId('sage-chat-send-btn').click();

    // Step 4: Wait for MealPlanCard
    await expect(page.getByTestId('sage-mealplan-card')).toBeVisible({ timeout: 10000 });

    // Step 5: Re-mock chat for follow-up message
    await mockChatAPI(page, 'Sure! You can also try the vegetarian Pad Thai as a lighter option.');

    // Step 6: Send a follow-up message (BUG-K: this would fail if chatPhase stuck in handing_off)
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Any lighter options?');
    await page.getByTestId('sage-chat-send-btn').click();

    // Step 7: Verify AI replies (proves chatPhase transitioned to chatting)
    // Wait for bubble count to increase — at least the new AI reply bubble
    const bubbles = page.getByTestId('sage-chat-bubble');
    await expect(bubbles).not.toHaveCount(0, { timeout: 10000 });
    await expect(async () => {
      const count = await bubbles.count();
      expect(count).toBeGreaterThanOrEqual(2);
    }).toPass({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/regression-bugk-followup.png' });
  });
});

test.describe('Error Path Regression', () => {
  test('Analyze API error shows toast error message', async ({ page }) => {
    await mockAnalyzeAPIError(page);

    await page.goto('/');
    await expect(page.getByTestId('sage-home-scan-btn')).toBeVisible({ timeout: 10000 });
    await page.getByTestId('sage-home-scan-btn').click();

    // Upload image
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-menu.png',
      mimeType: 'image/png',
      buffer: createMinimalPNG(),
    });

    // Confirm analyze
    const analyzeBtn = page.getByRole('button', { name: /Analyze|确认并分析/i });
    await expect(analyzeBtn).toBeVisible({ timeout: 5000 });
    await analyzeBtn.click();

    // Verify error toast appears (toUserFacingError maps 503 → "AI service is temporarily unavailable")
    await expect(page.getByText(/unavailable|不可用|失败|retry|重试/i).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/regression-error-analyze.png' });
  });

  test('Chat API error shows toast error message', async ({ page }) => {
    // First: successful scan to get to chat
    await scanToChat(page);

    // Then: mock chat to fail
    await mockChatAPIError(page);

    // Send a message
    const chatInput = page.getByTestId('sage-chat-input');
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Tell me about this menu');
    await page.getByTestId('sage-chat-send-btn').click();

    // Verify error toast appears
    await expect(page.getByText(/failed|失败|unavailable|不可用|retry|重试/i).first()).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'screenshots/regression-error-chat.png' });
  });
});
