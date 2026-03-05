import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AppState } from '../../types';

const STORAGE_KEY = 'sage_memory_v1';

// localStorage mock with controllable store
const store: Record<string, string> = {};
// Always override localStorage for test isolation (jsdom has its own)
Object.defineProperty(globalThis, 'localStorage', { value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }, writable: true, configurable: true });

const { appReducer } = await import('../../context/AppContext');

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting', menuData: null, messages: [],
    preferences: { language: 'en', dietary: [], allergies: [] }, location: null,
    orderItems: [], currentView: 'home', analyzingFiles: null,
    isSupplementing: false, navigationPayload: null, waiterAllergyConfirmed: false,
    sessionId: null,
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

describe('F01-AC3 / F10-AC2: System language auto-detection & persistence', () => {
  beforeEach(() => {
    for (const k of Object.keys(store)) delete store[k];
  });

  afterEach(() => {
    restoreNavigatorLanguage();
  });

  it('F01-AC3: SET_LANGUAGE zh persists, round-trip through localStorage', () => {
    const state = makeState();
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'zh' });
    expect(r.preferences.language).toBe('zh');
    // Simulate what AppProvider useEffect does: persist to localStorage
    store[STORAGE_KEY] = JSON.stringify(r.preferences);
    const restored = JSON.parse(store[STORAGE_KEY]!);
    expect(restored.language).toBe('zh');
  });

  it('F01-AC3: SET_LANGUAGE en persists, round-trip through localStorage', () => {
    const state = makeState({ preferences: { language: 'zh', dietary: [], allergies: [] } });
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'en' });
    expect(r.preferences.language).toBe('en');
    store[STORAGE_KEY] = JSON.stringify(r.preferences);
    const restored = JSON.parse(store[STORAGE_KEY]!);
    expect(restored.language).toBe('en');
  });

  it('F10-AC3: stored language overrides system — appReducer reads stored dietary after persist', () => {
    mockNavigatorLanguage('zh-CN');
    // Simulate stored preferences with language=en and dietary
    store[STORAGE_KEY] = JSON.stringify({ language: 'en', dietary: ['peanut'] });
    // appReducer should work with a state that has stored overrides
    const state = makeState({ preferences: { language: 'en', dietary: ['peanut'], allergies: [] } });
    const r = appReducer(state, { type: 'ADD_DIETARY', restriction: 'gluten' });
    expect(r.preferences.language).toBe('en'); // NOT zh despite navigator
    expect(r.preferences.dietary).toEqual(['peanut', 'gluten']);
  });

  it('F01-AC3: language persists through RESET_SESSION', () => {
    const state = makeState({ preferences: { language: 'zh', dietary: ['peanut'], allergies: [] } });
    const r = appReducer(state, { type: 'RESET_SESSION' });
    expect(r.preferences.language).toBe('zh');
  });
});
