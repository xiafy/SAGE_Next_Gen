import { describe, it, expect } from 'vitest';
import {
  getPhrase, getAllergyLabel, getConfirmPhrase,
  COMM_PHRASES, ALLERGY_TRANSLATIONS,
} from '../localLanguage';
import type { CommunicationAction } from '../../../../shared/types';

describe('getPhrase', () => {
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

  it('all 4 actions × 5 MVP languages have translations', () => {
    for (const action of actions) {
      for (const lang of mvpLangs) {
        const phrase = getPhrase(action, lang);
        expect(phrase, `Missing: ${action}/${lang}`).toBeTruthy();
      }
    }
  });
});

describe('coverage: all allergens × MVP languages', () => {
  const allergens = Object.keys(ALLERGY_TRANSLATIONS);
  const mvpLangs = ['en', 'zh', 'th', 'ja', 'ko'];

  it('all allergens × 5 MVP languages have translations', () => {
    for (const allergen of allergens) {
      for (const lang of mvpLangs) {
        const label = getAllergyLabel(allergen, lang);
        expect(label, `Missing: ${allergen}/${lang}`).toBeTruthy();
      }
    }
  });
});
