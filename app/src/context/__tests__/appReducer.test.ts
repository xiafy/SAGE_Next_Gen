import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState } from '../../types';
import type { MenuItem, MenuData } from '../../../../shared/types';
import { PENDING_SUMMARY_KEY, SESSION_KEY } from '../../utils/memory';

// Provide localStorage mock for module-level init in AppContext
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

function clearStore() {
  for (const k of Object.keys(store)) delete store[k];
}

// Now safe to import
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

describe('appReducer — APPLY_ORDER_ACTION', () => {
  const dish1 = makeMenuItem('d1', 'Tom Yum');
  const dish2 = makeMenuItem('d2', 'Pad Thai');
  const menuData = makeMenuData([dish1, dish2]);

  it('add: new dish with qty=2', () => {
    const r = appReducer(makeState({ menuData }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 2 } } });
    expect(r.orderItems).toHaveLength(1);
    expect(r.orderItems[0]!.quantity).toBe(2);
  });

  it('add: existing dish → sets qty (target)', () => {
    const r = appReducer(makeState({ menuData, orderItems: [{ menuItem: dish1, quantity: 1 }] }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 3 } } });
    expect(r.orderItems[0]!.quantity).toBe(3);
  });

  it('add: dishId not in menuData → ignore', () => {
    const r = appReducer(makeState({ menuData }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'xx', qty: 1 } } });
    expect(r.orderItems).toHaveLength(0);
  });

  it('remove: existing dish', () => {
    const r = appReducer(makeState({ orderItems: [{ menuItem: dish1, quantity: 1 }] }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'remove', remove: { dishId: 'd1' } } });
    expect(r.orderItems).toHaveLength(0);
  });

  it('remove: non-existent → ignore', () => {
    const r = appReducer(makeState({ orderItems: [{ menuItem: dish1, quantity: 1 }] }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'remove', remove: { dishId: 'nope' } } });
    expect(r.orderItems).toHaveLength(1);
  });

  it('replace: normal', () => {
    const r = appReducer(makeState({ menuData, orderItems: [{ menuItem: dish1, quantity: 1 }] }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'replace', remove: { dishId: 'd1' }, add: { dishId: 'd2', qty: 2 } } });
    expect(r.orderItems).toHaveLength(1);
    expect(r.orderItems[0]!.menuItem.id).toBe('d2');
  });

  it('replace: same dishId → ignore', () => {
    const r = appReducer(makeState({ menuData, orderItems: [{ menuItem: dish1, quantity: 1 }] }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'replace', remove: { dishId: 'd1' }, add: { dishId: 'd1', qty: 2 } } });
    expect(r.orderItems[0]!.quantity).toBe(1);
  });

  it('replace: remove not found → only add', () => {
    const r = appReducer(makeState({ menuData }), { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'replace', remove: { dishId: 'nope' }, add: { dishId: 'd2', qty: 1 } } });
    expect(r.orderItems).toHaveLength(1);
  });
});

describe('appReducer — BATCH_ADD_TO_ORDER', () => {
  const d1 = makeMenuItem('d1'), d2 = makeMenuItem('d2'), d3 = makeMenuItem('d3');

  it('multiple dishes', () => {
    const r = appReducer(makeState(), { type: 'BATCH_ADD_TO_ORDER', items: [{ menuItem: d1, quantity: 1 }, { menuItem: d2, quantity: 2 }] });
    expect(r.orderItems).toHaveLength(2);
  });

  it('duplicate → merges', () => {
    const r = appReducer(makeState(), { type: 'BATCH_ADD_TO_ORDER', items: [{ menuItem: d1, quantity: 1 }, { menuItem: d1, quantity: 2 }] });
    expect(r.orderItems).toHaveLength(1);
    expect(r.orderItems[0]!.quantity).toBe(3);
  });

  it('merges with existing', () => {
    const r = appReducer(makeState({ orderItems: [{ menuItem: d1, quantity: 1 }] }), { type: 'BATCH_ADD_TO_ORDER', items: [{ menuItem: d1, quantity: 2 }, { menuItem: d3, quantity: 1 }] });
    expect(r.orderItems).toHaveLength(2);
    expect(r.orderItems.find(o => o.menuItem.id === 'd1')!.quantity).toBe(3);
  });
});

describe('appReducer — RESET_SESSION', () => {
  it('clears orderItems and waiterAllergyConfirmed', () => {
    const r = appReducer(makeState({ orderItems: [{ menuItem: makeMenuItem('d1'), quantity: 1 }], waiterAllergyConfirmed: true }), { type: 'RESET_SESSION' });
    expect(r.orderItems).toHaveLength(0);
    expect(r.waiterAllergyConfirmed).toBe(false);
  });
});

describe('OPEN-001: badge should show total quantity, not item count', () => {
  const d1 = makeMenuItem('d1', 'Tom Yum');
  const d2 = makeMenuItem('d2', 'Pad Thai');

  it('total quantity = sum of all item quantities', () => {
    const state = makeState({
      orderItems: [
        { menuItem: d1, quantity: 3 },
        { menuItem: d2, quantity: 2 },
      ],
    });
    const totalQty = state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
    expect(totalQty).toBe(5);
    expect(state.orderItems.length).toBe(2); // item count != total qty
  });

  it('ADD_TO_ORDER increments qty for existing item', () => {
    const state = makeState({ orderItems: [{ menuItem: d1, quantity: 2 }] });
    const r = appReducer(state, { type: 'ADD_TO_ORDER', item: d1 });
    const totalQty = r.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
    expect(totalQty).toBe(3);
    expect(r.orderItems.length).toBe(1);
  });

  it('UPDATE_ORDER_QTY changes qty correctly', () => {
    const state = makeState({
      orderItems: [
        { menuItem: d1, quantity: 1 },
        { menuItem: d2, quantity: 1 },
      ],
    });
    const r = appReducer(state, { type: 'UPDATE_ORDER_QTY', itemId: 'd1', quantity: 5 });
    const totalQty = r.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
    expect(totalQty).toBe(6);
  });
});

describe('F01-AC6 / F08-AC6: RESET_SESSION complete clearing (DEC-057)', () => {
  it('F01-AC6: clears orderItems + messages + menuData + chatPhase + navigationPayload', () => {
    const d1 = makeMenuItem('d1');
    const state = makeState({
      menuData: makeMenuData([d1]),
      orderItems: [{ menuItem: d1, quantity: 3 }],
      messages: [
        { id: 'm1', role: 'user', content: 'hi', timestamp: 1 },
        { id: 'm2', role: 'assistant', content: 'hello', timestamp: 2 },
      ],
      chatPhase: 'chatting',
      waiterAllergyConfirmed: true,
      navigationPayload: { newlySelected: [], existingOrder: [] },
      currentView: 'chat',
    });
    const r = appReducer(state, { type: 'RESET_SESSION' });
    expect(r.orderItems).toHaveLength(0);
    expect(r.messages).toHaveLength(0);
    expect(r.menuData).toBeNull();
    expect(r.chatPhase).toBe('pre_chat');
    expect(r.waiterAllergyConfirmed).toBe(false);
    expect(r.navigationPayload).toBeNull();
  });

  it('F01-AC6: RESET_SESSION preserves language preference', () => {
    const state = makeState({ preferences: { language: 'zh', dietary: ['peanut'], allergies: [] } });
    const r = appReducer(state, { type: 'RESET_SESSION' });
    expect(r.preferences.language).toBe('zh');
  });
});

describe('F10-AC2: SET_LANGUAGE updates preferences.language', () => {
  it('F10-AC2: en → zh', () => {
    const state = makeState({ preferences: { language: 'en', dietary: [], allergies: [] } });
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'zh' });
    expect(r.preferences.language).toBe('zh');
  });

  it('F10-AC2: zh → en', () => {
    const state = makeState({ preferences: { language: 'zh', dietary: [], allergies: [] } });
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'en' });
    expect(r.preferences.language).toBe('en');
  });

  it('F10-AC2: language change does not affect other preferences', () => {
    const state = makeState({ preferences: { language: 'en', dietary: ['peanut'], allergies: [], flavors: ['spicy'] } });
    const r = appReducer(state, { type: 'SET_LANGUAGE', language: 'zh' });
    expect(r.preferences.dietary).toEqual(['peanut']);
    expect(r.preferences.flavors).toEqual(['spicy']);
  });
});

describe('appReducer — SET_NAV_PAYLOAD / SET_WAITER_ALLERGY_CONFIRMED', () => {
  it('SET_NAV_PAYLOAD sets and clears', () => {
    const p = { newlySelected: [], existingOrder: [] };
    let r = appReducer(makeState(), { type: 'SET_NAV_PAYLOAD', payload: p });
    expect(r.navigationPayload).toBe(p);
    r = appReducer(r, { type: 'SET_NAV_PAYLOAD', payload: null });
    expect(r.navigationPayload).toBeNull();
  });

  it('SET_WAITER_ALLERGY_CONFIRMED toggles', () => {
    let r = appReducer(makeState(), { type: 'SET_WAITER_ALLERGY_CONFIRMED', confirmed: true });
    expect(r.waiterAllergyConfirmed).toBe(true);
    r = appReducer(r, { type: 'SET_WAITER_ALLERGY_CONFIRMED', confirmed: false });
    expect(r.waiterAllergyConfirmed).toBe(false);
  });
});

describe('Memory Step 2 — sessionId + pending summary', () => {
  beforeEach(clearStore);

  it('RESET_SESSION generates a new sessionId', () => {
    const state = makeState();
    const r = appReducer(state, { type: 'RESET_SESSION' });
    expect(r.sessionId).toBeTruthy();
    expect(typeof r.sessionId).toBe('string');
  });

  it('RESET_SESSION saves pending summary when session has messages', () => {
    const state = makeState({
      sessionId: 'old-session-123',
      messages: [
        { id: 'm1', role: 'user', content: 'hi', timestamp: 1000 },
        { id: 'm2', role: 'assistant', content: 'hello', timestamp: 2000 },
      ],
      menuData: makeMenuData([makeMenuItem('d1')]),
    });
    appReducer(state, { type: 'RESET_SESSION' });
    const pending = JSON.parse(store[PENDING_SUMMARY_KEY]!);
    expect(pending.sessionId).toBe('old-session-123');
    expect(pending.messages).toHaveLength(2);
    expect(pending.startTime).toBe(1000);
    expect(pending.menuData).toBeDefined();
  });

  it('RESET_SESSION does NOT save pending summary when no messages', () => {
    const state = makeState({ sessionId: 'empty-session' });
    appReducer(state, { type: 'RESET_SESSION' });
    expect(store[PENDING_SUMMARY_KEY]).toBeUndefined();
  });

  it('RESET_SESSION does NOT save pending summary when sessionId is null', () => {
    const state = makeState({
      messages: [{ id: 'm1', role: 'user', content: 'hi', timestamp: 1000 }],
    });
    appReducer(state, { type: 'RESET_SESSION' });
    expect(store[PENDING_SUMMARY_KEY]).toBeUndefined();
  });

  it('RESET_SESSION clears sage_current_session from localStorage', () => {
    store[SESSION_KEY] = JSON.stringify({ sessionId: 'x', messages: [], startTime: 0 });
    const state = makeState({ sessionId: 'x' });
    appReducer(state, { type: 'RESET_SESSION' });
    expect(store[SESSION_KEY]).toBeUndefined();
  });

  it('START_ANALYZE generates sessionId when null', () => {
    const state = makeState({ sessionId: null });
    const r = appReducer(state, { type: 'START_ANALYZE', files: [new File([], 'test.jpg')] });
    expect(r.sessionId).toBeTruthy();
    expect(typeof r.sessionId).toBe('string');
  });

  it('START_ANALYZE keeps existing sessionId (supplement scan)', () => {
    const state = makeState({ sessionId: 'existing-123', isSupplementing: true });
    const r = appReducer(state, { type: 'START_ANALYZE', files: [new File([], 'test.jpg')] });
    expect(r.sessionId).toBe('existing-123');
  });

  it('Continue session: NAV_TO preserves sessionId', () => {
    const state = makeState({ sessionId: 'keep-me' });
    const r = appReducer(state, { type: 'NAV_TO', view: 'chat' });
    expect(r.sessionId).toBe('keep-me');
  });
});
