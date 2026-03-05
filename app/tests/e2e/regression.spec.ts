import { test, expect } from '@playwright/test';
import { mockAnalyzeAPI, mockChatAPIWithMealPlan, mockChatAPI } from './mocks/api-mock';

/**
 * SAGE E2E Regression Tests
 *
 * BUG-K: processAIResponse — MealPlan JSON correctly dispatches
 *        (chatPhase transitions from handing_off to chatting)
 * BUG-J: MealPlanCard renders in Chat view
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

  // Wait for chat to load with results
  await expect(page.getByTestId('sage-chat-messages')).toBeVisible({ timeout: 15000 });
  await page.waitForTimeout(2000);
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

    // Step 4: Wait for streaming to complete
    await page.waitForTimeout(3000);

    // Step 5: Verify MealPlanCard rendered (BUG-K fix: chatPhase transitions correctly)
    // The MealPlanCard should appear in the chat messages
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
    await page.waitForTimeout(3000);
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
    await page.waitForTimeout(3000);
    await expect(page.getByTestId('sage-mealplan-card')).toBeVisible({ timeout: 10000 });

    // Step 5: Re-mock chat for follow-up message
    await mockChatAPI(page, 'Sure! You can also try the vegetarian Pad Thai as a lighter option.');

    // Step 6: Send a follow-up message (BUG-K: this would fail if chatPhase stuck in handing_off)
    await expect(chatInput).toBeVisible({ timeout: 5000 });
    await chatInput.fill('Any lighter options?');
    await page.getByTestId('sage-chat-send-btn').click();

    // Step 7: Verify AI replies (proves chatPhase transitioned to chatting)
    await page.waitForTimeout(2000);
    const bubbles = page.getByTestId('sage-chat-bubble');
    const count = await bubbles.count();
    expect(count).toBeGreaterThanOrEqual(2); // At least user + AI messages

    await page.screenshot({ path: 'screenshots/regression-bugk-followup.png' });
  });
});
