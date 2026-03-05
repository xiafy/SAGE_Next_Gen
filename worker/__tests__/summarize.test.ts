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
  it('accepts valid AI response', () => {
    const result = SummarizeResponseSchema.safeParse(validAIResponse);
    expect(result.success).toBe(true);
  });

  it('rejects keyMoments with more than 3 entries', () => {
    const result = SummarizeResponseSchema.safeParse({
      ...validAIResponse,
      summary: {
        ...validAIResponse.summary,
        keyMoments: ['a', 'b', 'c', 'd'],
      },
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid evolution action', () => {
    const result = SummarizeResponseSchema.safeParse({
      ...validAIResponse,
      evolutions: [{ action: 'weaken', key: 'test' }],
    });
    expect(result.success).toBe(false);
  });

  it('accepts empty evolutions', () => {
    const result = SummarizeResponseSchema.safeParse({
      ...validAIResponse,
      evolutions: [],
    });
    expect(result.success).toBe(true);
  });

  it('accepts strengthen without entry', () => {
    const result = SummarizeResponseSchema.safeParse({
      ...validAIResponse,
      evolutions: [
        { action: 'strengthen', key: 'seafood', newConfidence: 0.7 },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('accepts modify with oldValue/newValue', () => {
    const result = SummarizeResponseSchema.safeParse({
      ...validAIResponse,
      evolutions: [
        { action: 'modify', key: 'spicy', oldValue: 'no_spicy', newValue: 'mild_spicy' },
      ],
    });
    expect(result.success).toBe(true);
  });
});

// ─── Prompt builder ─────────────────────────

describe('buildMemorySummarizePrompt', () => {
  it('includes conversation content', () => {
    const prompt = buildMemorySummarizePrompt(validRequest);
    expect(prompt).toContain('我不吃猪肉');
    expect(prompt).toContain('冬阴功汤');
  });

  it('includes user preferences', () => {
    const prompt = buildMemorySummarizePrompt(validRequest);
    expect(prompt).toContain('peanut');
    expect(prompt).toContain('no_pork');
    expect(prompt).toContain('spicy');
  });

  it('includes restaurant type from menuData', () => {
    const prompt = buildMemorySummarizePrompt(validRequest);
    expect(prompt).toContain('泰式');
  });

  it('includes preference evolution rules', () => {
    const prompt = buildMemorySummarizePrompt(validRequest);
    expect(prompt).toContain('add');
    expect(prompt).toContain('strengthen');
    expect(prompt).toContain('modify');
    expect(prompt).toContain('explicit');
    expect(prompt).toContain('inferred');
    expect(prompt).toContain('confidence');
  });

  it('works without menuData', () => {
    const { menuData: _, ...noMenu } = validRequest;
    const prompt = buildMemorySummarizePrompt(noMenu);
    expect(prompt).toContain('我不吃猪肉');
  });

  it('includes learned preferences when present', () => {
    const req = {
      ...validRequest,
      preferences: {
        ...validRequest.preferences,
        learned: [{
          value: 'seafood',
          source: 'inferred' as const,
          confidence: 0.5,
          firstSeen: '2026-01-01',
          lastSeen: '2026-01-01',
          occurrences: 2,
        }],
      },
    };
    const prompt = buildMemorySummarizePrompt(req);
    expect(prompt).toContain('seafood');
    expect(prompt).toContain('inferred');
  });
});
