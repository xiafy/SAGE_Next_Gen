import { describe, expect, it } from 'vitest';
import { processAIResponse } from '../processAIResponse';

function buildInput(overrides: Partial<Parameters<typeof processAIResponse>[0]> = {}) {
  return {
    fullText: 'plain text',
    mode: 'chat' as const,
    chatPhase: 'chatting',
    menuItemIds: new Set<string>(['dish_1', 'dish_2']),
    language: 'zh',
    replacingVersion: null,
    ...overrides,
  };
}

describe('processAIResponse', () => {
  it('1) plain text response -> single message, no JSON parsing', () => {
    const result = processAIResponse(buildInput({ fullText: '今天推荐冬阴功汤。' }));
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]?.content).toBe('今天推荐冬阴功汤。');
    expect(result.quickReplies).toEqual([]);
    expect(result.recommendations).toEqual([]);
    expect(result.orderAction).toBeUndefined();
  });

  it('2) JSON code block with message + quickReplies -> extracted correctly', () => {
    const fullText = '```json\n{"message":"试试冬阴功","quickReplies":["好","换一道"]}\n```';
    const result = processAIResponse(buildInput({ fullText }));
    expect(result.messages[0]?.content).toBe('试试冬阴功');
    expect(result.quickReplies).toEqual(['好', '换一道']);
  });

  it('3) MealPlan JSON -> includes mealPlan card + mealPlanVersion', () => {
    const fullText = [
      '这是你的方案：',
      '```json',
      JSON.stringify({
        version: 1,
        totalEstimate: 180,
        currency: 'THB',
        rationale: 'balanced',
        diners: 2,
        courses: [
          {
            name: 'Main',
            items: [
              {
                dishId: 'dish_1',
                name: 'Tom Yum',
                nameOriginal: 'ต้มยำ',
                price: 120,
                reason: '招牌',
                quantity: 1,
              },
            ],
          },
        ],
      }),
      '```',
    ].join('\n');

    const result = processAIResponse(buildInput({ fullText }));
    expect(result.messages.some((m) => m.cardType === 'mealPlan')).toBe(true);
    expect(result.mealPlanVersion).toBe(1);
  });

  it('4) MealPlan with replacingVersion=3 -> mealPlanVersion=4', () => {
    const fullText = [
      '```json',
      JSON.stringify({
        version: 1,
        totalEstimate: 200,
        currency: 'THB',
        rationale: 'replace',
        diners: 2,
        courses: [{ name: 'Main', items: [] }],
      }),
      '```',
    ].join('\n');

    const result = processAIResponse(buildInput({ fullText, replacingVersion: 3 }));
    expect(result.mealPlanVersion).toBe(4);
    const card = result.messages.find((m) => m.cardType === 'mealPlan');
    expect(card?.cardData?.version).toBe(4);
  });

  it('5) OrderAction JSON -> orderAction populated + toast', () => {
    const fullText = [
      '已帮你加入。',
      '```json',
      JSON.stringify({ orderAction: 'add', add: { dishId: 'dish_1', qty: 1 } }),
      '```',
    ].join('\n');

    const result = processAIResponse(buildInput({ fullText }));
    expect(result.orderAction).toEqual({ orderAction: 'add', add: { dishId: 'dish_1', qty: 1 } });
    expect(result.toasts.length).toBeGreaterThan(0);
  });

  it('6) BUG-K regression: non-mealPlan/orderAction JSON block but valid chat JSON still yields message + transition', () => {
    const fullText = [
      '```json',
      JSON.stringify({
        message: '已根据你的偏好整理好。',
        quickReplies: ['继续', '看方案'],
      }),
      '```',
    ].join('\n');

    const result = processAIResponse(buildInput({ fullText, mode: 'chat', chatPhase: 'handing_off' }));
    expect(result.messages[0]?.content).toBe('已根据你的偏好整理好。');
    expect(result.chatPhaseTransition).toBe('chatting');
  });

  it('7) BUG-K regression: handing_off + mode=chat -> chatPhaseTransition=chatting', () => {
    const result = processAIResponse(buildInput({ fullText: '普通文本', mode: 'chat', chatPhase: 'handing_off' }));
    expect(result.chatPhaseTransition).toBe('chatting');
  });

  it('8) malformed JSON -> fallback plain text + regenerate quickReply', () => {
    const fullText = '```json\n{broken\n```';
    const result = processAIResponse(buildInput({ fullText, language: 'en' }));
    expect(result.messages[0]?.content).toBe(fullText);
    expect(result.quickReplies).toEqual(['🔄 Regenerate']);
  });

  it('9) recommendations with invalid itemIds -> filtered out', () => {
    const fullText = JSON.stringify({
      message: '推荐如下',
      recommendations: [
        { itemId: 'dish_1', reason: '好吃' },
        { itemId: 'invalid', reason: '不存在' },
      ],
    });

    const result = processAIResponse(buildInput({ fullText }));
    expect(result.recommendations).toEqual([{ itemId: 'dish_1', reason: '好吃' }]);
  });

  it('10) preferenceUpdates in response -> passed through', () => {
    const updates = [{ type: 'restriction', action: 'add', value: 'peanut' }] as const;
    const fullText = JSON.stringify({
      message: '收到',
      preferenceUpdates: updates,
    });

    const result = processAIResponse(buildInput({ fullText }));
    expect(result.preferenceUpdates).toEqual(updates);
  });
});

// ─── F06 AC Tests (Batch 1) ───

describe('F06-AC11: MealPlan streamed — extracted from JSON code block after narrative', () => {
  it('F06-AC11: narrative text + JSON block → text message + MealPlanCard message', () => {
    const narrative = '根据你的口味偏好，我为你搭配了一套泰式晚餐：\n\n这套方案兼顾辣度和清淡，适合2人享用。';
    const mealPlanJson = JSON.stringify({
      version: 1, totalEstimate: 350, currency: 'THB', rationale: 'balanced',
      diners: 2,
      courses: [{
        name: 'Main', items: [
          { dishId: 'dish_1', name: 'Tom Yum', nameOriginal: 'ต้มยำ', price: 200, reason: 'spicy', quantity: 1 },
        ],
      }],
    });
    const fullText = `${narrative}\n\`\`\`json\n${mealPlanJson}\n\`\`\``;
    const result = processAIResponse(buildInput({ fullText }));

    // Should produce 2 messages: narrative text + mealPlan card
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    const textMsg = result.messages.find(m => m.content.includes('泰式晚餐'));
    expect(textMsg).toBeDefined();
    const cardMsg = result.messages.find(m => m.cardType === 'mealPlan');
    expect(cardMsg).toBeDefined();
    expect(cardMsg!.cardData).toBeDefined();
  });
});

describe('F06-AC12: Streaming fallback levels', () => {
  it('F06-AC12 L1: valid JSON → MealPlanCard rendered', () => {
    const fullText = [
      '方案如下',
      '```json',
      JSON.stringify({
        version: 1, totalEstimate: 200, currency: 'THB', rationale: 'ok', diners: 2,
        courses: [{ name: 'Main', items: [{ dishId: 'dish_1', name: 'A', nameOriginal: 'A', price: 100, reason: '', quantity: 1 }] }],
      }),
      '```',
    ].join('\n');
    const result = processAIResponse(buildInput({ fullText }));
    expect(result.messages.some(m => m.cardType === 'mealPlan')).toBe(true);
    expect(result.quickReplies).toEqual([]);
  });

  it('F06-AC12 L2: truncated JSON with repairable structure → still parsed', () => {
    // Missing closing brace — L2 repair should fix it
    const fullText = [
      '```json',
      '{"version":1,"totalEstimate":200,"currency":"THB","rationale":"ok","diners":2,"courses":[{"name":"Main","items":[{"dishId":"dish_1","name":"A","nameOriginal":"A","price":100,"reason":"","quantity":1}]}]',
      '```',
    ].join('\n');
    const result = processAIResponse(buildInput({ fullText }));
    expect(result.messages.some(m => m.cardType === 'mealPlan')).toBe(true);
  });

  it('F06-AC12 L3: completely broken JSON → fallback to plain text + regenerate button', () => {
    const fullText = '```json\n{completely broken json garbage!!!\n```';
    const result = processAIResponse(buildInput({ fullText, language: 'en' }));
    expect(result.messages.some(m => m.cardType === 'mealPlan')).toBe(false);
    expect(result.quickReplies).toContain('🔄 Regenerate');
  });

  it('F06-AC12 L3 zh: broken JSON → Chinese regenerate button', () => {
    const fullText = '```json\n{garbage\n```';
    const result = processAIResponse(buildInput({ fullText, language: 'zh' }));
    expect(result.quickReplies).toContain('🔄 重新生成方案');
  });
});

describe('F06-AC13: AI operates Order (add/remove/replace)', () => {
  it('F06-AC13: orderAction add → parsed and toast generated (zh)', () => {
    const fullText = [
      '好的，帮你加入冬阴功。',
      '```json',
      JSON.stringify({ orderAction: 'add', add: { dishId: 'dish_1', qty: 1 } }),
      '```',
    ].join('\n');
    const result = processAIResponse(buildInput({ fullText, language: 'zh' }));
    expect(result.orderAction).toBeDefined();
    expect(result.orderAction!.orderAction).toBe('add');
    expect(result.toasts).toContain('已添加到点菜单');
  });

  it('F06-AC13: orderAction remove → parsed and toast', () => {
    const fullText = [
      'Removed the soup.',
      '```json',
      JSON.stringify({ orderAction: 'remove', remove: { dishId: 'dish_2' } }),
      '```',
    ].join('\n');
    const result = processAIResponse(buildInput({ fullText, language: 'en' }));
    expect(result.orderAction!.orderAction).toBe('remove');
    expect(result.toasts).toContain('Removed from order');
  });

  it('F06-AC13: orderAction replace → parsed and toast', () => {
    const fullText = [
      'Replaced with Pad Thai.',
      '```json',
      JSON.stringify({ orderAction: 'replace', remove: { dishId: 'dish_1' }, add: { dishId: 'dish_2', qty: 1 } }),
      '```',
    ].join('\n');
    const result = processAIResponse(buildInput({ fullText, language: 'en' }));
    expect(result.orderAction!.orderAction).toBe('replace');
    expect(result.toasts).toContain('Dish replaced');
  });
});
