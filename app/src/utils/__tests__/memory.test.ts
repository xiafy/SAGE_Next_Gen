import { describe, it, expect, beforeEach } from 'vitest';
import type { SAGE_Memory, PreferenceEntry, PreferenceEvolution, SessionSummary } from '../../../../shared/types';

const MEMORY_KEY = 'sage_memory_v1';
const OLD_PREFS_KEY = 'sage_preferences_v1';

// localStorage mock
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

const { loadMemory, saveMemory, migrateOldPreferences, addSession, applyEvolutions } = await import('../memory');

function clearStore() {
  for (const k of Object.keys(store)) delete store[k];
}

function makeEntry(value: string, confidence = 0.5): PreferenceEntry {
  return {
    value,
    source: 'inferred',
    confidence,
    firstSeen: '2026-01-01',
    lastSeen: '2026-01-01',
    occurrences: 1,
  };
}

function makeSession(id: string): SessionSummary {
  return {
    id,
    date: '2026-03-05',
    dishesOrdered: ['dish1'],
    dishesSkipped: [],
    preferencesLearned: [],
    keyMoments: [],
  };
}

function makeMemory(overrides: Partial<SAGE_Memory> = {}): SAGE_Memory {
  return {
    version: 1,
    preferences: {
      restrictions: [],
      allergies: [],
      flavors: [],
      spicyLevel: 'medium',
      language: 'en',
      learned: [],
      history: [],
    },
    sessions: [],
    lastUpdated: Date.now(),
    ...overrides,
  };
}

describe('loadMemory', () => {
  beforeEach(clearStore);

  it('returns default when localStorage is empty', () => {
    const mem = loadMemory();
    expect(mem.version).toBe(1);
    expect(mem.preferences.language).toBe('en');
    expect(mem.preferences.allergies).toEqual([]);
    expect(mem.preferences.learned).toEqual([]);
    expect(mem.sessions).toEqual([]);
  });

  it('loads existing SAGE_Memory from localStorage', () => {
    const existing = makeMemory({ preferences: { ...makeMemory().preferences, language: 'zh' } });
    store[MEMORY_KEY] = JSON.stringify(existing);
    const mem = loadMemory();
    expect(mem.preferences.language).toBe('zh');
  });

  it('ignores corrupt data and returns default', () => {
    store[MEMORY_KEY] = 'NOT_JSON!!!';
    const mem = loadMemory();
    expect(mem.version).toBe(1);
    expect(mem.preferences.language).toBe('en');
  });
});

describe('migrateOldPreferences', () => {
  beforeEach(clearStore);

  it('migrates old format to new SAGE_Memory', () => {
    store[OLD_PREFS_KEY] = JSON.stringify({
      language: 'zh',
      dietary: ['peanut', 'shellfish'],
      flavors: ['spicy'],
    });

    const mem = migrateOldPreferences();
    expect(mem).not.toBeNull();
    expect(mem!.version).toBe(1);
    expect(mem!.preferences.language).toBe('zh');
    expect(mem!.preferences.restrictions).toEqual([
      { type: 'dislike', value: 'peanut' },
      { type: 'dislike', value: 'shellfish' },
    ]);
    expect(mem!.preferences.flavors).toEqual([
      { type: 'like', value: 'spicy', strength: 2 },
    ]);
    expect(mem!.preferences.spicyLevel).toBe('medium');
    expect(mem!.preferences.learned).toEqual([]);
  });

  it('writes new key and removes old key', () => {
    store[OLD_PREFS_KEY] = JSON.stringify({ language: 'en', dietary: [] });
    migrateOldPreferences();
    expect(store[OLD_PREFS_KEY]).toBeUndefined();
    expect(store[MEMORY_KEY]).toBeDefined();
  });

  it('returns null when no old data exists', () => {
    expect(migrateOldPreferences()).toBeNull();
  });

  it('loadMemory triggers migration when only old key exists', () => {
    store[OLD_PREFS_KEY] = JSON.stringify({ language: 'zh', dietary: ['gluten'] });
    const mem = loadMemory();
    expect(mem.preferences.language).toBe('zh');
    expect(mem.preferences.restrictions).toEqual([{ type: 'dislike', value: 'gluten' }]);
    expect(store[OLD_PREFS_KEY]).toBeUndefined();
  });
});

describe('saveMemory', () => {
  beforeEach(clearStore);

  it('persists memory to localStorage', () => {
    const mem = makeMemory();
    saveMemory(mem);
    const stored = JSON.parse(store[MEMORY_KEY]!);
    expect(stored.version).toBe(1);
  });
});

describe('addSession — FIFO', () => {
  it('adds a session', () => {
    const mem = makeMemory();
    const result = addSession(mem, makeSession('s1'));
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0]!.id).toBe('s1');
  });

  it('FIFO: 21 sessions → keeps latest 20', () => {
    let mem = makeMemory();
    for (let i = 0; i < 21; i++) {
      mem = addSession(mem, makeSession(`s${i}`));
    }
    expect(mem.sessions).toHaveLength(20);
    expect(mem.sessions[0]!.id).toBe('s1');
    expect(mem.sessions[19]!.id).toBe('s20');
  });
});

describe('applyEvolutions', () => {
  it('add: inserts new learned preference', () => {
    const mem = makeMemory();
    const entry = makeEntry('seafood', 0.3);
    const evolutions: PreferenceEvolution[] = [
      { action: 'add', key: 'seafood', entry },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned).toHaveLength(1);
    expect(result.preferences.learned[0]!.value).toBe('seafood');
    expect(result.preferences.learned[0]!.confidence).toBe(0.3);
  });

  it('add: does not duplicate existing entry', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('seafood', 0.5)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'add', key: 'seafood', entry: makeEntry('seafood', 0.3) },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned).toHaveLength(1);
    expect(result.preferences.learned[0]!.confidence).toBe(0.5);
  });

  it('strengthen: increases confidence by 0.2', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('seafood', 0.5)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'strengthen', key: 'seafood' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned[0]!.confidence).toBeCloseTo(0.7);
    expect(result.preferences.learned[0]!.occurrences).toBe(2);
  });

  it('strengthen: caps at 1.0', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('seafood', 0.9)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'strengthen', key: 'seafood' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned[0]!.confidence).toBe(1.0);
  });

  it('modify: changes value and sets confidence to 1.0', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('no_spicy', 0.5)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'modify', key: 'no_spicy', oldValue: 'no_spicy', newValue: 'mild_spicy' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned[0]!.value).toBe('mild_spicy');
    expect(result.preferences.learned[0]!.confidence).toBe(1.0);
  });

  it('weaken: decreases confidence by 0.2', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('seafood', 0.5)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'weaken', key: 'seafood' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned[0]!.confidence).toBeCloseTo(0.3);
  });

  it('weaken: floors at 0', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('seafood', 0.1)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'weaken', key: 'seafood' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned[0]!.confidence).toBe(0);
  });

  it('weaken below 0.3: entry preserved but should not be injected', () => {
    const mem = makeMemory({
      preferences: {
        ...makeMemory().preferences,
        learned: [makeEntry('seafood', 0.4)],
      },
    });
    const evolutions: PreferenceEvolution[] = [
      { action: 'weaken', key: 'seafood' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned).toHaveLength(1);
    expect(result.preferences.learned[0]!.confidence).toBeCloseTo(0.2);
    // Entry still exists but confidence < 0.3 means it won't be injected into prompts
  });

  it('multiple evolutions in sequence', () => {
    const mem = makeMemory();
    const evolutions: PreferenceEvolution[] = [
      { action: 'add', key: 'seafood', entry: makeEntry('seafood', 0.3) },
      { action: 'add', key: 'no_pork', entry: makeEntry('no_pork', 1.0) },
      { action: 'strengthen', key: 'seafood' },
    ];
    const result = applyEvolutions(mem, evolutions);
    expect(result.preferences.learned).toHaveLength(2);
    expect(result.preferences.learned[0]!.confidence).toBeCloseTo(0.5);
    expect(result.preferences.learned[1]!.value).toBe('no_pork');
  });
});
