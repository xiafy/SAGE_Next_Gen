import { describe, it, expect } from 'vitest';
import {
  getPhrase, getAllergyLabel, getConfirmPhrase, ALLERGY_TRANSLATIONS,
} from '../localLanguage';
import type { CommunicationAction } from '../../../../shared/types';

describe('F08-AC8: getPhrase — waiter communication panel translations', () => {
  it('sold_out, th → ไม่มี', () => {
    expect(getPhrase('sold_out', 'th')).toBe('ไม่มี');
  });

  it('sold_out, unknown → fallback English', () => {
    expect(getPhrase('sold_out', 'unknown')).toBe('Sold out');
  });

  it('sold_out, TH (uppercase) → normalizes', () => {
    expect(getPhrase('sold_out', 'TH')).toBe('ไม่มี');
  });

  it('sold_out, th-TH → normalizes', () => {
    expect(getPhrase('sold_out', 'th-TH')).toBe('ไม่มี');
  });
});

describe('getAllergyLabel', () => {
  it('peanut, ja → ピーナッツアレルギー', () => {
    expect(getAllergyLabel('peanut', 'ja')).toBe('ピーナッツアレルギー');
  });

  it('peanut, unknown → fallback English', () => {
    expect(getAllergyLabel('peanut', 'unknown')).toBe('Peanut allergy');
  });
});

describe('getConfirmPhrase', () => {
  it('sold_out, zh, Tom Kha → contains dish name and 没有了', () => {
    const result = getConfirmPhrase('sold_out', 'zh', 'Tom Kha');
    expect(result).toContain('Tom Kha');
    expect(result).toContain('没有了');
  });

  it('sold_out, unknown lang → fallback English', () => {
    const result = getConfirmPhrase('sold_out', 'unknown', 'Tom Kha');
    expect(result).toContain('Tom Kha');
    expect(result).toContain('sold out');
  });
});

describe('coverage: all actions × MVP languages', () => {
  const actions: CommunicationAction[] = ['sold_out', 'change', 'add_more', 'other'];
  const mvpLangs = ['en', 'zh', 'th', 'ja', 'ko'];

  const expected: Record<string, Record<string, string>> = {
    sold_out: { en: 'Sold out', zh: '没有了', th: 'ไม่มี', ja: '売り切れ', ko: '품절' },
    change:   { en: 'Change this', zh: '换一道', th: 'เปลี่ยน', ja: '変更', ko: '변경' },
    add_more: { en: 'One more', zh: '加一份', th: 'เพิ่ม', ja: 'もう一つ', ko: '추가' },
    other:    { en: 'Other question', zh: '其他问题', th: 'อื่นๆ', ja: 'その他', ko: '기타' },
  };

  it('all 4 actions × 5 MVP languages return correct translations', () => {
    for (const action of actions) {
      for (const lang of mvpLangs) {
        const phrase = getPhrase(action, lang);
        expect(phrase, `Mismatch: ${action}/${lang}`).toBe(expected[action]![lang]);
      }
    }
  });
});

describe('coverage: all allergens × MVP languages', () => {
  const allergens = Object.keys(ALLERGY_TRANSLATIONS);
  const mvpLangs = ['en', 'zh', 'th', 'ja', 'ko'];

  it('all allergens × 5 MVP languages return non-empty strings matching source table', () => {
    for (const allergen of allergens) {
      for (const lang of mvpLangs) {
        const label = getAllergyLabel(allergen, lang);
        const expectedLabel = ALLERGY_TRANSLATIONS[allergen]![lang]!;
        expect(label, `Mismatch: ${allergen}/${lang}`).toBe(expectedLabel);
      }
    }
  });
});
