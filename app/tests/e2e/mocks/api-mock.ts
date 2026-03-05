import { Page } from '@playwright/test';
import { resolve, dirname } from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ─── Helpers ────────────────────────────────────

function toSSE(event: string, payload: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
}

// ─── Analyze API Mock (SSE) ─────────────────────

export async function mockAnalyzeAPI(page: Page) {
  // Load fixture data
  const fixturePath = resolve(
    __dirname,
    '../../../../tests/fixtures/expected/menu-thai-02.json',
  );
  const fixtureData = JSON.parse(readFileSync(fixturePath, 'utf-8'));

  await page.route('**/api/analyze', async (route) => {
    const progressEvents = [
      { stage: 'uploading', progress: 10, message: 'Uploading images...' },
      { stage: 'preparing', progress: 20, message: 'Preparing analysis...' },
      { stage: 'analyzing', progress: 55, message: 'Analyzing menu...' },
      { stage: 'validating', progress: 85, message: 'Validating results...' },
      { stage: 'completed', progress: 100, message: 'Done!' },
    ];

    let body = '';
    for (const p of progressEvents) {
      body += toSSE('progress', p);
    }
    body += toSSE('result', {
      ok: true,
      data: fixtureData,
      requestId: 'mock-req-001',
    });
    body += toSSE('done', '[DONE]');

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body,
    });
  });
}

// ─── Analyze API Error Mock (SSE error event) ───

export async function mockAnalyzeAPIError(page: Page) {
  await page.route('**/api/analyze', async (route) => {
    let body = '';
    body += toSSE('progress', { stage: 'uploading', progress: 10, message: 'Uploading images...' });
    body += toSSE('error', {
      ok: false,
      error: { message: 'Menu analysis failed (503): AI service temporarily unavailable' },
    });

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body,
    });
  });
}

// ─── Chat API Mock (OpenAI-compatible SSE) ──────

export async function mockChatAPI(page: Page, responseText?: string) {
  const text = responseText ??
    '这是一家经典的泰式餐厅，主打泰式炒河粉和各种炒饭。推荐尝试 Pad Thai（泰式炒河粉），这是泰国最具代表性的菜品之一。';

  await page.route('**/api/chat', async (route) => {
    // Split response text into small chunks to simulate streaming
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += 8) {
      chunks.push(text.slice(i, i + 8));
    }

    let body = '';
    for (const chunk of chunks) {
      body += `data: ${JSON.stringify({
        choices: [{ delta: { content: chunk } }],
      })}\n\n`;
    }
    body += 'data: [DONE]\n\n';

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body,
    });
  });
}

// ─── Chat API Error Mock ────────────────────────

export async function mockChatAPIError(page: Page) {
  await page.route('**/api/chat', async (route) => {
    await route.fulfill({
      status: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ok: false,
        error: { message: 'AI service temporarily unavailable' },
      }),
    });
  });
}

// ─── Chat API Mock with MealPlan JSON ───────────

export async function mockChatAPIWithMealPlan(page: Page) {
  const mealPlanJson = JSON.stringify({
    version: 1,
    totalEstimate: 280,
    currency: 'THB',
    rationale: 'A balanced Thai meal for 2 people',
    courses: [
      {
        name: 'Main',
        items: [
          {
            dishId: 'item0100',
            name: 'Pad Thai (Pork)',
            nameOriginal: 'Pad Thai / ผัดไทย Pork / หมู',
            price: 70,
            reason: 'Classic Thai staple',
            quantity: 1,
          },
          {
            dishId: 'item1100',
            name: 'Basil Rice (Pork)',
            nameOriginal: 'Rice topped with stir-fried basil / ข้าวกระเพรา Pork / หมู',
            price: 70,
            reason: 'Popular spicy dish',
            quantity: 2,
          },
        ],
      },
      {
        name: 'Side',
        items: [
          {
            dishId: 'item0600',
            name: 'Fried Rice (Pork)',
            nameOriginal: 'Fried rice / ข้าวผัด Pork / หมู',
            price: 70,
            reason: 'Light accompaniment',
            quantity: 1,
          },
        ],
      },
    ],
    diners: 2,
  });

  const responseText =
    `好的，根据你的需求，我为你推荐以下用餐方案：\n\n\`\`\`json\n${mealPlanJson}\n\`\`\`\n\n这套方案包含经典泰式菜品，适合两人用餐。`;

  await mockChatAPI(page, responseText);
}

// ─── Supplementary Analyze Mock ─────────────────

export async function mockSupplementaryAnalyzeAPI(page: Page) {
  // A smaller second menu result to simulate supplementary scan
  const supplementData = {
    menuType: 'restaurant',
    detectedLanguage: 'th',
    priceLevel: 1,
    currency: 'THB',
    categories: [
      {
        id: 'cat02',
        nameOriginal: 'DRINKS',
        nameTranslated: '饮料',
        itemIds: ['item2100', 'item2200'],
      },
    ],
    items: [
      {
        id: 'item2100',
        nameOriginal: 'Thai Tea / ชาไทย',
        nameTranslated: '泰式奶茶',
        price: 40,
        priceText: '40.-',
        tags: [],
        brief: '经典泰式奶茶，浓郁香甜',
        briefDetail: '泰国传统奶茶，用红茶叶和炼乳调制',
        allergens: [{ type: 'dairy', uncertain: false }],
        dietaryFlags: [],
        spiceLevel: 0,
        calories: 180,
      },
      {
        id: 'item2200',
        nameOriginal: 'Coconut Water / น้ำมะพร้าว',
        nameTranslated: '椰子水',
        price: 50,
        priceText: '50.-',
        tags: [],
        brief: '新鲜椰子水，清爽解渴',
        briefDetail: '天然椰子水，热带清凉饮品',
        allergens: [],
        dietaryFlags: ['vegan'],
        spiceLevel: 0,
        calories: 60,
      },
    ],
    processingMs: 8000,
    imageCount: 1,
  };

  await page.route('**/api/analyze', async (route) => {
    const progressEvents = [
      { stage: 'uploading', progress: 10, message: 'Uploading images...' },
      { stage: 'analyzing', progress: 55, message: 'Analyzing menu...' },
      { stage: 'completed', progress: 100, message: 'Done!' },
    ];

    let body = '';
    for (const p of progressEvents) {
      body += toSSE('progress', p);
    }
    body += toSSE('result', {
      ok: true,
      data: supplementData,
      requestId: 'mock-req-002',
    });
    body += toSSE('done', '[DONE]');

    await route.fulfill({
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
      body,
    });
  });
}
