import { describe, it, expect } from 'vitest';
import { SummarizeRequestSchema, SummarizeResponseSchema } from '../schemas/memorySchema.js';
import { buildMemorySummarizePrompt } from '../prompts/memorySummarize.js';

const validRequest = {
  messages: [
    { role: 'user', content: '我不吃猪肉' },
    { role: 'assistant', content: '好的，我帮你避开含猪肉的菜品' },
    { role: 'user', content: '来一份冬阴功汤' },
    { role: 'assistant', content: '好的，已加入点餐单' },
  ],
  preferences: {
    restrictions: [{ type: 'diet' as const, value: 'no_pork' }],
    allergies: ['peanut'],
    flavors: [{ type: 'like' as const, value: 'spicy', strength: 2 as const }],
    spicyLevel: 'medium' as const,
    language: 'zh' as const,
    learned: [],
    history: [],
  },
  menuData: { restaurantType: '泰式' },
};

const validAIResponse = {
  summary: {
    dishesOrdered: ['冬阴功汤'],
    dishesSkipped: [],
    restaurantType: '泰式',
    preferencesLearned: ['不吃猪肉', '喜欢泰式汤品'],
    keyMoments: ['用户明确表示不吃猪肉', '选择了冬阴功汤'],
  },
  evolutions: [
    {
      action: 'add' as const,
      key: 'no_pork',
      entry: {
        value: 'no_pork',
        source: 'explicit' as const,
        confidence: 1.0,
        firstSeen: '2026-03-05',
        lastSeen: '2026-03-05',
        occurrences: 1,
      },
    },
    {
      action: 'add' as const,
      key: 'thai_soup',
      entry: {
        value: 'thai_soup',
        source: 'inferred' as const,
        confidence: 0.3,
        firstSeen: '2026-03-05',
        lastSeen: '2026-03-05',
        occurrences: 1,
      },
    },
  ],
};

// ─── Request validation ─────────────────────────

describe('SummarizeRequestSchema', () => {
  it('accepts valid request', () => {
    const result = SummarizeRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it('rejects missing messages field', () => {
    const { messages: _, ...noMessages } = validRequest;
    const result = SummarizeRequestSchema.safeParse(noMessages);
    expect(result.success).toBe(false);
  });

  it('rejects empty messages array', () => {
    const result = SummarizeRequestSchema.safeParse({
      ...validRequest,
      messages: [],
    });
    expect(result.success).toBe(false);
  });

  it('accepts request without menuData', () => {
    const { menuData: _, ...noMenu } = validRequest;
    const result = SummarizeRequestSchema.safeParse(noMenu);
    expect(result.success).toBe(true);
  });

  it('applies defaults for missing preference fields', () => {
    const result = SummarizeRequestSchema.safeParse({
      messages: [{ role: 'user', content: 'hello' }],
      preferences: {},
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.preferences.allergies).toEqual([]);
      expect(result.data.preferences.learned).toEqual([]);
      expect(result.data.preferences.spicyLevel).toBe('medium');
    }
  });
});

// ─── Response validation ─────────────────────────


describe('SummarizeResponseSchema', () => {
  it('accepts null values in evolution optional fields', () => {
    const aiResponse = {
      summary: {
        dishesOrdered: ['蒸鸡胸'],
        dishesSkipped: [],
        restaurantType: '中餐',
        preferencesLearned: ['对海鲜过敏'],
        keyMoments: ['用户声明过敏'],
      },
      evolutions: [{
        action: 'strengthen',
        key: 'allergen_seafood',
        entry: null,
        newConfidence: 1.0,
        oldValue: null,
        newValue: null,
      }],
    };
    const result = SummarizeResponseSchema.safeParse(aiResponse);
    expect(result.success).toBe(true);
  });

  it('accepts missing optional fields in evolutions', () => {
    const aiResponse = {
      summary: {
        dishesOrdered: [],
        dishesSkipped: [],
        preferencesLearned: [],
        keyMoments: [],
      },
      evolutions: [{
        action: 'add',
        key: 'light_food',
        entry: {
          value: 'light_food',
          source: 'explicit',
          confidence: 1.0,
          firstSeen: '2026-03-06',
          lastSeen: '2026-03-06',
          occurrences: 1,
        },
      }],
    };
    const result = SummarizeResponseSchema.safeParse(aiResponse);
    expect(result.success).toBe(true);
  });
});
