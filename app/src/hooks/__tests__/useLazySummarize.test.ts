import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { SAGE_Memory, SessionSummary, PreferenceEvolution, PreferenceEntry } from '../../../../shared/types';

const MEMORY_KEY = 'sage_memory_v1';
const PENDING_SUMMARY_KEY = 'sage_pending_summary';

// localStorage mock — always override (Anti-Pattern 6)
const store: Record<string, string> = {};
const mockStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { for (const k of Object.keys(store)) delete store[k]; },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });

// Mock the API module
const mockSummarizeSession = vi.fn();
vi.mock('../../api/memory', () => ({
  summarizeSession: (...args: unknown[]) => mockSummarizeSession(...args),
}));

const { useLazySummarize } = await import('../useLazySummarize');

function clearStore() {
  for (const k of Object.keys(store)) delete store[k];
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

function makeSummary(id = 'test'): SessionSummary {
  return {
    id,
    date: '2026-03-05',
    restaurantType: 'thai',
    dishesOrdered: ['pad thai'],
    dishesSkipped: ['tom yum'],
    preferencesLearned: ['likes mild'],
    keyMoments: ['chose pad thai over tom yum'],
  };
}

function makeEntry(value: string, confidence = 0.3): PreferenceEntry {
  return {
    value,
    source: 'inferred',
    confidence,
    firstSeen: '2026-03-05',
    lastSeen: '2026-03-05',
    occurrences: 1,
  };
}

function setPending(data: Record<string, unknown>) {
  store[PENDING_SUMMARY_KEY] = JSON.stringify(data);
}

function setMemory(mem: SAGE_Memory) {
  store[MEMORY_KEY] = JSON.stringify(mem);
}

function getMemory(): SAGE_Memory {
  return JSON.parse(store[MEMORY_KEY]!);
}

async function flushPromises() {
  await new Promise((r) => setTimeout(r, 0));
}

describe('useLazySummarize', () => {
  beforeEach(() => {
    clearStore();
    mockSummarizeSession.mockReset();
  });

  it('does nothing when no pending summary exists', async () => {
    renderHook(() => useLazySummarize());
    await flushPromises();
    expect(mockSummarizeSession).not.toHaveBeenCalled();
  });

  it('clears pending when messages array is empty', async () => {
    setPending({ sessionId: 's1', messages: [], startTime: 1000 });
    renderHook(() => useLazySummarize());
    await flushPromises();
    expect(store[PENDING_SUMMARY_KEY]).toBeUndefined();
    expect(mockSummarizeSession).not.toHaveBeenCalled();
  });

  it('clears pending when JSON is corrupt', async () => {
    store[PENDING_SUMMARY_KEY] = 'NOT_VALID_JSON!!!';
    renderHook(() => useLazySummarize());
    await flushPromises();
    expect(store[PENDING_SUMMARY_KEY]).toBeUndefined();
    expect(mockSummarizeSession).not.toHaveBeenCalled();
  });

  it('calls API and updates memory on success', async () => {
    const mem = makeMemory();
    setMemory(mem);
    setPending({
      sessionId: 'sess-abc',
      messages: [
        { role: 'user', content: 'hi' },
        { role: 'assistant', content: 'hello' },
      ],
      startTime: 1709625600000, // 2024-03-05
      menuData: { restaurantType: 'thai' },
    });

    const summary = makeSummary();
    const evolutions: PreferenceEvolution[] = [];
    mockSummarizeSession.mockResolvedValueOnce({ summary, evolutions });

    renderHook(() => useLazySummarize());
    await flushPromises();

    expect(mockSummarizeSession).toHaveBeenCalledOnce();
    expect(mockSummarizeSession).toHaveBeenCalledWith(
      [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }],
      mem.preferences,
      { restaurantType: 'thai' },
    );

    // pending should be cleared
    expect(store[PENDING_SUMMARY_KEY]).toBeUndefined();

    // memory should have the session
    const updated = getMemory();
    expect(updated.sessions).toHaveLength(1);
    expect(updated.sessions[0]!.id).toBe('sess-abc');
  });

  it('applies evolutions when present', async () => {
    const mem = makeMemory();
    setMemory(mem);
    setPending({
      sessionId: 'sess-evo',
      messages: [{ role: 'user', content: 'I love seafood' }],
      startTime: Date.now(),
    });

    const summary = makeSummary();
    const evolutions: PreferenceEvolution[] = [
      { action: 'add', key: 'seafood', entry: makeEntry('seafood', 0.3) },
    ];
    mockSummarizeSession.mockResolvedValueOnce({ summary, evolutions });

    renderHook(() => useLazySummarize());
    await flushPromises();

    const updated = getMemory();
    expect(updated.preferences.learned).toHaveLength(1);
    expect(updated.preferences.learned[0]!.value).toBe('seafood');
    expect(updated.preferences.learned[0]!.confidence).toBe(0.3);
  });

  it('keeps pending when API fails (retry on next launch)', async () => {
    const mem = makeMemory();
    setMemory(mem);
    setPending({
      sessionId: 'sess-fail',
      messages: [{ role: 'user', content: 'hello' }],
      startTime: Date.now(),
    });

    mockSummarizeSession.mockRejectedValueOnce(new Error('Network error'));

    renderHook(() => useLazySummarize());
    await flushPromises();

    // pending should still exist for retry
    expect(store[PENDING_SUMMARY_KEY]).toBeDefined();

    // memory should not have been updated with a new session
    const updated = getMemory();
    expect(updated.sessions).toHaveLength(0);
  });

  it('summary gets correct id and date from pending data', async () => {
    const mem = makeMemory();
    setMemory(mem);
    setPending({
      sessionId: 'custom-id-123',
      messages: [{ role: 'user', content: 'test' }],
      startTime: new Date('2026-02-14T10:00:00Z').getTime(),
    });

    const summary = makeSummary();
    mockSummarizeSession.mockResolvedValueOnce({ summary, evolutions: [] });

    renderHook(() => useLazySummarize());
    await flushPromises();

    const updated = getMemory();
    expect(updated.sessions[0]!.id).toBe('custom-id-123');
    expect(updated.sessions[0]!.date).toBe('2026-02-14');
  });
});
