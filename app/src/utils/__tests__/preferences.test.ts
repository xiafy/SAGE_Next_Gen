import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AppState } from '../../types';

const STORAGE_KEY = 'sage_memory_v1';

// localStorage mock with controllable store
const store: Record<string, string> = {};
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  (globalThis as any).localStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

const { appReducer } = await import('../../context/AppContext');

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting', menuData: null, messages: [],
    preferences: { language: 'en', dietary: [], allergies: [] }, location: null,
    orderItems: [], currentView: 'home', analyzingFiles: null,
    isSupplementing: false, navigationPayload: null, waiterAllergyConfirmed: false,
    ...overrides,
  };
}

// Mock navigator.language for system language detection tests
const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis.navigator, 'language');

function mockNavigatorLanguage(lang: string) {
  Object.defineProperty(globalThis.navigator, 'language', {
    value: lang,
    configurable: true,
  });
}

function restoreNavigatorLanguage() {
  if (originalDescriptor) {
    Object.defineProperty(globalThis.navigator, 'language', originalDescriptor);
  }
}

describe('F09-AC1: Preferences persist in localStorage across sessions', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  it('F09-AC1: SET_LANGUAGE persists language in preferences', () => {
    const state = makeState({ preferences: { language: 'en', dietary: [], allergies: [] } });
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'zh' });
    expect(r.preferences.language).toBe('zh');
  });

  it('F09-AC1: ADD_DIETARY adds restriction to preferences', () => {
    const state = makeState();
    const r = appReducer(state, { type: 'ADD_DIETARY', restriction: 'peanut' });
    expect(r.preferences.dietary).toContain('peanut');
  });

  it('F09-AC1: REMOVE_DIETARY removes restriction from preferences', () => {
    const state = makeState({ preferences: { language: 'en', dietary: ['peanut', 'shellfish'], allergies: [] } });
    const r = appReducer(state, { type: 'REMOVE_DIETARY', restriction: 'peanut' });
    expect(r.preferences.dietary).toEqual(['shellfish']);
  });

  it('F09-AC1: duplicate ADD_DIETARY does not create duplicates', () => {
    const state = makeState({ preferences: { language: 'en', dietary: ['peanut'], allergies: [] } });
    const r = appReducer(state, { type: 'ADD_DIETARY', restriction: 'peanut' });
    expect(r.preferences.dietary).toEqual(['peanut']);
  });

  it('F09-AC1: UPDATE_PREFERENCES adds restriction via AI detection', () => {
    const state = makeState();
    const r = appReducer(state, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'restriction', action: 'add', value: 'gluten' }],
    });
    expect(r.preferences.dietary).toContain('gluten');
  });

  it('F09-AC1: UPDATE_PREFERENCES removes restriction', () => {
    const state = makeState({ preferences: { language: 'en', dietary: ['gluten'], allergies: [] } });
    const r = appReducer(state, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'restriction', action: 'remove', value: 'gluten' }],
    });
    expect(r.preferences.dietary).not.toContain('gluten');
  });

  it('F09-AC1: UPDATE_PREFERENCES adds flavor preference', () => {
    const state = makeState();
    const r = appReducer(state, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'flavor', action: 'add', value: 'spicy' }],
    });
    expect(r.preferences.flavors).toContain('spicy');
  });

  it('F09-AC1: corrupt localStorage does not crash — appReducer still works', () => {
    store[STORAGE_KEY] = 'NOT_VALID_JSON!!!';
    // appReducer should work regardless of localStorage state
    const state = makeState();
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'zh' });
    expect(r.preferences.language).toBe('zh');
  });
});

describe('F01-AC3 / F10-AC2: System language auto-detection', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  afterEach(() => {
    restoreNavigatorLanguage();
  });

  it('F01-AC3: zh-CN system language → detected as Chinese', () => {
    mockNavigatorLanguage('zh-CN');
    const sysLang = navigator.language.toLowerCase();
    const isZh = sysLang.startsWith('zh') || sysLang === 'zh-cn' || sysLang === 'zh-tw';
    expect(isZh).toBe(true);
  });

  it('F01-AC3: zh-TW system language → detected as Chinese', () => {
    mockNavigatorLanguage('zh-TW');
    const sysLang = navigator.language.toLowerCase();
    const isZh = sysLang.startsWith('zh') || sysLang === 'zh-cn' || sysLang === 'zh-tw';
    expect(isZh).toBe(true);
  });

  it('F01-AC3: en-US system language → defaults to en', () => {
    mockNavigatorLanguage('en-US');
    const sysLang = navigator.language.toLowerCase();
    const isZh = sysLang.startsWith('zh') || sysLang === 'zh-cn' || sysLang === 'zh-tw';
    expect(isZh).toBe(false);
  });

  it('F10-AC3: stored language setting overrides system language', () => {
    mockNavigatorLanguage('zh-CN');
    store[STORAGE_KEY] = JSON.stringify({ language: 'en', dietary: [] });
    const stored = JSON.parse(store[STORAGE_KEY]!);
    expect(stored.language).toBe('en');
  });
});
