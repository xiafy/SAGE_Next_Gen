/**
 * Waiter four-action business consequence tests.
 * Tests the reducer-level effects of actions that WaiterModeView dispatches.
 * We test the state transitions directly via appReducer since WaiterModeView
 * has heavy browser API dependencies (WakeLock, etc.).
 */
import { describe, it, expect } from 'vitest';
import type { AppState } from '../../types';
import type { MenuItem, MenuData } from '../../../../shared/types';

if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.getItem !== 'function') {
  const store: Record<string, string> = {};
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

function makeMenuItem(id: string, name = 'Dish'): MenuItem {
  return { id, nameOriginal: name, nameTranslated: name, tags: [], brief: '', allergens: [], dietaryFlags: [], spiceLevel: 0, calories: null };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting', menuData: null, messages: [],
    preferences: { language: 'en', dietary: [] }, location: null,
    orderItems: [], currentView: 'waiter', analyzingFiles: null,
    isSupplementing: false, navigationPayload: null, waiterAllergyConfirmed: false,
    ...overrides,
  };
}

const d1 = makeMenuItem('d1', 'Tom Yum');
const d2 = makeMenuItem('d2', 'Pad Thai');

describe('Waiter Actions — business consequences via reducer', () => {
  it('sold_out: REMOVE_FROM_ORDER removes correct dish', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }, { menuItem: d2, quantity: 2 }] });
    const r = appReducer(s, { type: 'REMOVE_FROM_ORDER', itemId: 'd1' });
    expect(r.orderItems).toHaveLength(1);
    expect(r.orderItems[0]!.menuItem.id).toBe('d2');
  });

  it('sold_out → order becomes empty after removal', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }] });
    const r = appReducer(s, { type: 'REMOVE_FROM_ORDER', itemId: 'd1' });
    expect(r.orderItems).toHaveLength(0);
  });

  it('add_more: ADD_TO_ORDER increments quantity for existing item', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }] });
    const r = appReducer(s, { type: 'ADD_TO_ORDER', item: d1 });
    expect(r.orderItems).toHaveLength(1);
    expect(r.orderItems[0]!.quantity).toBe(2);
  });

  it('add_more: ADD_TO_ORDER adds new item', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }] });
    const r = appReducer(s, { type: 'ADD_TO_ORDER', item: d2 });
    expect(r.orderItems).toHaveLength(2);
  });

  it('other: NAV_TO chat navigates correctly', () => {
    const s = makeState({ currentView: 'waiter' });
    const r = appReducer(s, { type: 'NAV_TO', view: 'chat' });
    expect(r.currentView).toBe('chat');
  });

  it('end meal: RESET_SESSION clears all session data', () => {
    const s = makeState({
      orderItems: [{ menuItem: d1, quantity: 1 }],
      waiterAllergyConfirmed: true,
      messages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }],
      currentView: 'waiter',
    });
    let r = appReducer(s, { type: 'RESET_SESSION' });
    r = appReducer(r, { type: 'NAV_TO', view: 'home' });
    expect(r.orderItems).toHaveLength(0);
    expect(r.waiterAllergyConfirmed).toBe(false);
    expect(r.messages).toHaveLength(0);
    expect(r.currentView).toBe('home');
  });
});
