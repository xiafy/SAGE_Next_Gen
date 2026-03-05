import { describe, it, expect } from 'vitest';
import { buildAgentChatSystem } from '../prompts/agentChat.js';

const minimalMenu = {
  menuType: 'restaurant' as const,
  detectedLanguage: 'ja',
  priceLevel: 2 as const,
  currency: 'JPY',
  categories: [{ id: 'c1', nameOriginal: '寿司', nameTranslated: 'Sushi', itemIds: ['i1'] }],
  items: [{
    id: 'i1',
    nameOriginal: 'サーモン',
    nameTranslated: '三文鱼寿司',
    price: 300,
    priceText: '¥300',
    tags: ['popular' as const],
    brief: 'Fresh salmon sushi',
    allergens: [],
    dietaryFlags: [],
    spiceLevel: 0,
    calories: null,
  }],
  processingMs: 100,
  imageCount: 1,
};

const basePrefs = {
  restrictions: [],
  allergies: [] as string[],
  flavors: [],
  spicyLevel: 'medium' as const,
  learned: [] as Array<{ value: string; confidence: number }>,
  history: [],
};

const baseContext = {
  language: 'zh' as const,
  timestamp: Date.now(),
  utcOffsetMinutes: 480,
};

// ─── Allergens ⚠️ ──────────────────────────

describe('prompt injection: allergens', () => {
  it('includes ⚠️ allergen warning when allergies present', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: { ...basePrefs, allergies: ['peanut', 'shellfish'] },
      context: baseContext,
    });
    expect(prompt).toContain('⚠️');
    expect(prompt).toContain('peanut');
    expect(prompt).toContain('shellfish');
  });

  it('shows 无 when no allergies (zh)', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: baseContext,
    });
    expect(prompt).toContain('⚠️');
    expect(prompt).toContain('过敏原');
  });

  it('shows none when no allergies (en)', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: { ...baseContext, language: 'en' },
    });
    expect(prompt).toContain('⚠️');
    expect(prompt).toContain('Allergens');
  });
});

// ─── Learned preferences (confidence filter) ──

describe('prompt injection: learned preferences', () => {
  it('includes learned prefs with confidence >= 0.7', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: {
        ...basePrefs,
        learned: [
          { value: 'loves_ramen', confidence: 0.8 },
          { value: 'dislikes_raw', confidence: 0.4 },
        ],
      },
      context: baseContext,
    });
    expect(prompt).toContain('loves_ramen');
    expect(prompt).not.toContain('dislikes_raw');
  });

  it('shows 无 when no learned prefs qualify (zh)', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: {
        ...basePrefs,
        learned: [{ value: 'low_conf', confidence: 0.3 }],
      },
      context: baseContext,
    });
    expect(prompt).toContain('AI 学习到的偏好: 无');
  });
});

// ─── Restaurant type matching ──────────────

describe('prompt injection: session matching', () => {
  it('injects matched sessions for same restaurant type', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: baseContext,
      memory: {
        sessions: [
          { restaurantType: 'restaurant', dishesOrdered: ['拉面'], dishesSkipped: ['生鱼片'], keyMoments: ['喜欢浓汤'], date: '2026-03-01' },
          { restaurantType: 'bar', dishesOrdered: ['啤酒'], dishesSkipped: [], keyMoments: [], date: '2026-03-02' },
        ],
      },
    });
    expect(prompt).toContain('拉面');
    expect(prompt).toContain('生鱼片');
    expect(prompt).toContain('喜欢浓汤');
    // bar session should NOT match restaurant type
    expect(prompt).not.toContain('啤酒');
  });

  it('fallback: most recent 2 sessions when no type match', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: baseContext,
      memory: {
        sessions: [
          { restaurantType: 'cafe', dishesOrdered: ['咖啡'], dishesSkipped: [], keyMoments: [], date: '2026-03-01' },
          { restaurantType: 'bar', dishesOrdered: ['啤酒'], dishesSkipped: [], keyMoments: [], date: '2026-03-02' },
          { restaurantType: 'dessert', dishesOrdered: ['蛋糕'], dishesSkipped: [], keyMoments: [], date: '2026-03-03' },
        ],
      },
    });
    // Should fallback to last 2 (bar + dessert)
    expect(prompt).toContain('啤酒');
    expect(prompt).toContain('蛋糕');
    expect(prompt).not.toContain('咖啡');
  });

  it('limits to 3 matched sessions max', () => {
    const sessions = Array.from({ length: 5 }, (_, i) => ({
      restaurantType: 'restaurant',
      dishesOrdered: [`dish${i}`],
      dishesSkipped: [],
      keyMoments: [],
      date: `2026-03-0${i + 1}`,
    }));
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: baseContext,
      memory: { sessions },
    });
    // Last 3 should appear (dish2, dish3, dish4)
    expect(prompt).toContain('dish2');
    expect(prompt).toContain('dish3');
    expect(prompt).toContain('dish4');
    // First 2 should NOT appear
    expect(prompt).not.toContain('dish0');
    expect(prompt).not.toContain('dish1');
  });
});

// ─── Backward compatibility ─────────────────

describe('prompt injection: backward compatibility', () => {
  it('works without memory field', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: baseContext,
    });
    expect(prompt).toContain('SAGE');
    expect(prompt).toContain('首次用餐');
  });

  it('works with empty memory sessions', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: baseContext,
      memory: { sessions: [] },
    });
    expect(prompt).toContain('首次用餐');
  });

  it('en: shows First time dining with no sessions', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: basePrefs,
      context: { ...baseContext, language: 'en' },
    });
    expect(prompt).toContain('First time dining');
  });
});

// ─── Three-layer structure ──────────────────

describe('prompt injection: three-layer structure', () => {
  it('contains all three sections (zh)', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: { ...basePrefs, allergies: ['dairy'] },
      context: baseContext,
      memory: {
        sessions: [
          { restaurantType: 'restaurant', dishesOrdered: ['寿司'], dishesSkipped: [], keyMoments: ['第一次吃日料'], date: '2026-03-01' },
        ],
      },
    });
    expect(prompt).toContain('## 用户画像');
    expect(prompt).toContain('## 相关用餐历史');
    expect(prompt).toContain('## 近期偏好变化');
  });

  it('contains all three sections (en)', () => {
    const prompt = buildAgentChatSystem({
      menu: minimalMenu,
      preferences: { ...basePrefs, allergies: ['dairy'] },
      context: { ...baseContext, language: 'en' },
      memory: {
        sessions: [
          { restaurantType: 'restaurant', dishesOrdered: ['sushi'], dishesSkipped: [], keyMoments: ['first time japanese'], date: '2026-03-01' },
        ],
      },
    });
    expect(prompt).toContain('## User Profile');
    expect(prompt).toContain('## Relevant Dining History');
    expect(prompt).toContain('## Recent Preference Changes');
  });
});
