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
    sessionId: null,
    ...overrides,
  };
}

function makeMenuItem(id: string, name = 'Dish'): MenuItem {
  return { id, nameOriginal: name, nameTranslated: name, tags: [], brief: '', allergens: [], dietaryFlags: [], spiceLevel: 0, calories: null };
}

function makeMenuData(items: MenuItem[]): MenuData {
  return { menuType: 'restaurant', detectedLanguage: 'th', priceLevel: 2, currency: 'THB', categories: [], items, processingMs: 100, imageCount: 1 };
}

describe('DEC-057 State Machine — multi-step sequences', () => {
  const d1 = makeMenuItem('d1', 'Tom Yum');
  const d2 = makeMenuItem('d2', 'Pad Thai');
  const menuData = makeMenuData([d1, d2]);

  it('Rule2: add item -> navigate Explore->Waiter -> order persists', () => {
    let s = makeState({ menuData });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 1 } } });
    expect(s.orderItems).toHaveLength(1);
    s = { ...s, currentView: 'explore' };
    s = appReducer(s, { type: 'NAV_TO', view: 'waiter' });
    expect(s.currentView).toBe('waiter');
    expect(s.orderItems).toHaveLength(1);
    expect(s.orderItems[0]!.menuItem.id).toBe('d1');
  });

  it('Rule3: SET_NAV_PAYLOAD lifecycle — set, use, consume (null)', () => {
    const payload = { newlySelected: [{ dishId: 'd1', name: 'A', nameOriginal: 'A', price: 100, category: 'X' }], existingOrder: [] };
    let s = makeState();
    s = appReducer(s, { type: 'SET_NAV_PAYLOAD', payload });
    expect(s.navigationPayload).toEqual(payload);
    // Simulate consuming after navigation
    s = appReducer(s, { type: 'NAV_TO', view: 'waiter' });
    expect(s.navigationPayload).toEqual(payload); // still present until consumed
    s = appReducer(s, { type: 'SET_NAV_PAYLOAD', payload: null });
    expect(s.navigationPayload).toBeNull();
  });

  it('Rule4: NAV_TO across views preserves order data throughout', () => {
    let s = makeState({ orderItems: [{ menuItem: d1, quantity: 2 }], menuData, currentView: 'chat' });
    s = appReducer(s, { type: 'NAV_TO', view: 'explore' });
    expect(s.currentView).toBe('explore');
    expect(s.orderItems).toHaveLength(1);
    s = appReducer(s, { type: 'NAV_TO', view: 'order' });
    expect(s.currentView).toBe('order');
    expect(s.orderItems[0]!.quantity).toBe(2);
    expect(s.menuData).not.toBeNull();
  });

  it('Rule6: SET_WAITER_ALLERGY_CONFIRMED full lifecycle: false->true->add order->RESET->false', () => {
    let s = makeState({ menuData });
    expect(s.waiterAllergyConfirmed).toBe(false);
    s = appReducer(s, { type: 'SET_WAITER_ALLERGY_CONFIRMED', confirmed: true });
    expect(s.waiterAllergyConfirmed).toBe(true);
    // Add an order action in between
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 1 } } });
    expect(s.waiterAllergyConfirmed).toBe(true);
    expect(s.orderItems).toHaveLength(1);
    // RESET clears everything
    s = appReducer(s, { type: 'RESET_SESSION' });
    expect(s.waiterAllergyConfirmed).toBe(false);
    expect(s.orderItems).toHaveLength(0);
    expect(s.messages).toHaveLength(0);
    expect(s.navigationPayload).toBeNull();
  });
});
