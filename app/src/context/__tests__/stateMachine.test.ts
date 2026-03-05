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

const { appReducer } = await import('../AppContext');

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting', menuData: null, messages: [],
    preferences: { language: 'en', dietary: [], allergies: [] }, location: null,
    orderItems: [], currentView: 'home', analyzingFiles: null,
    isSupplementing: false, navigationPayload: null, waiterAllergyConfirmed: false,
    ...overrides,
  };
}

function makeMenuItem(id: string, name = 'Dish'): MenuItem {
  return { id, nameOriginal: name, nameTranslated: name, tags: [], brief: '', allergens: [], dietaryFlags: [], spiceLevel: 0, calories: null };
}

function makeMenuData(items: MenuItem[]): MenuData {
  return { menuType: 'restaurant', detectedLanguage: 'th', priceLevel: 2, currency: 'THB', categories: [], items, processingMs: 100, imageCount: 1 };
}

describe('DEC-057 State Machine Tests', () => {
  const d1 = makeMenuItem('d1', 'Tom Yum');
  const d2 = makeMenuItem('d2', 'Pad Thai');
  const menuData = makeMenuData([d1, d2]);

  it('Rule1: APPLY_ORDER_ACTION add → orderItems updated (Waiter sole data source)', () => {
    const s = makeState({ menuData });
    const r = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 2 } } });
    expect(r.orderItems).toHaveLength(1);
    expect(r.orderItems[0]!.menuItem.id).toBe('d1');
    expect(r.orderItems[0]!.quantity).toBe(2);
  });

  it('Rule2: Explore→Waiter path viable when orderItems non-empty', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }], currentView: 'explore' });
    const r = appReducer(s, { type: 'NAV_TO', view: 'waiter' });
    expect(r.currentView).toBe('waiter');
    expect(r.orderItems).toHaveLength(1);
  });

  it('Rule3: SET_NAV_PAYLOAD sets payload, can be consumed (set to null)', () => {
    const payload = { newlySelected: [{ dishId: 'd1', name: 'A', nameOriginal: 'A', price: 100, category: 'X' }], existingOrder: [] };
    let r = appReducer(makeState(), { type: 'SET_NAV_PAYLOAD', payload });
    expect(r.navigationPayload).toEqual(payload);
    r = appReducer(r, { type: 'SET_NAV_PAYLOAD', payload: null });
    expect(r.navigationPayload).toBeNull();
  });

  it('Rule4: NAV_TO order does not clear data', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }], menuData, currentView: 'waiter' });
    const r = appReducer(s, { type: 'NAV_TO', view: 'order' });
    expect(r.currentView).toBe('order');
    expect(r.orderItems).toHaveLength(1);
    expect(r.menuData).not.toBeNull();
  });

  it('Rule5: RESET_SESSION clears orderItems, waiterAllergyConfirmed, messages, navigationPayload', () => {
    const s = makeState({
      orderItems: [{ menuItem: d1, quantity: 1 }],
      waiterAllergyConfirmed: true,
      messages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1 }],
      navigationPayload: { newlySelected: [], existingOrder: [] },
    });
    const r = appReducer(s, { type: 'RESET_SESSION' });
    expect(r.orderItems).toHaveLength(0);
    expect(r.waiterAllergyConfirmed).toBe(false);
    expect(r.messages).toHaveLength(0);
    expect(r.navigationPayload).toBeNull();
  });

  it('Rule6: SET_WAITER_ALLERGY_CONFIRMED lifecycle: false→true→RESET→false', () => {
    let s = makeState();
    expect(s.waiterAllergyConfirmed).toBe(false);
    s = appReducer(s, { type: 'SET_WAITER_ALLERGY_CONFIRMED', confirmed: true });
    expect(s.waiterAllergyConfirmed).toBe(true);
    s = appReducer(s, { type: 'RESET_SESSION' });
    expect(s.waiterAllergyConfirmed).toBe(false);
  });
});
