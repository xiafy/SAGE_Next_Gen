import { describe, it, expect } from 'vitest';
import type { AppState } from '../../types';
import type { MenuItem, MenuData } from '../../../../shared/types';

// localStorage mock (Anti-Pattern 6)
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', { value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  }, writable: true, configurable: true });

const { appReducer } = await import('../../context/AppContext');

function makeMenuItem(id: string, price?: number): MenuItem {
  return {
    id, nameOriginal: `Dish ${id}`, nameTranslated: `Dish ${id}`,
    tags: [], brief: '', allergens: [], dietaryFlags: [], spiceLevel: 0,
    calories: null, ...(price !== undefined ? { price } : {}),
  };
}

function makeMenuData(items: MenuItem[]): MenuData {
  return { menuType: 'restaurant', detectedLanguage: 'th', priceLevel: 2, currency: 'THB', categories: [], items, processingMs: 100, imageCount: 1 };
}

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

function totalQty(state: AppState): number {
  return state.orderItems.reduce((sum, oi) => sum + oi.quantity, 0);
}

function totalPrice(state: AppState): number {
  return state.orderItems.reduce((sum, oi) => sum + (oi.menuItem.price ?? 0) * oi.quantity, 0);
}

describe('F07-AC5: Badge shows total quantity, not item count', () => {
  const d1 = makeMenuItem('d1');
  const d2 = makeMenuItem('d2');
  const d3 = makeMenuItem('d3');
  const menuData = makeMenuData([d1, d2, d3]);

  it('F07-AC5: single item qty=3 via APPLY_ORDER_ACTION -> badge shows 3', () => {
    const r = appReducer(makeState({ menuData }), {
      type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 3 } },
    });
    expect(totalQty(r)).toBe(3);
    expect(r.orderItems).toHaveLength(1); // item count is 1, but badge should be 3
  });

  it('F07-AC5: multiple items -> badge is sum of quantities', () => {
    let s = makeState({ menuData });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 2 } } });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd2', qty: 3 } } });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd3', qty: 1 } } });
    expect(totalQty(s)).toBe(6);
    expect(s.orderItems).toHaveLength(3);
  });

  it('F07-AC5: empty order -> badge is 0', () => {
    const s = makeState();
    expect(totalQty(s)).toBe(0);
  });

  it('F07-AC5: quantity 0 item via UPDATE_ORDER_QTY removes item', () => {
    const s = makeState({ orderItems: [{ menuItem: d1, quantity: 1 }] });
    const r = appReducer(s, { type: 'UPDATE_ORDER_QTY', itemId: 'd1', quantity: 0 });
    expect(totalQty(r)).toBe(0);
    expect(r.orderItems).toHaveLength(0);
  });
});

describe('F08-AC1: Total price updates when quantity changes', () => {
  const d1 = makeMenuItem('d1', 120);
  const d2 = makeMenuItem('d2', 80);
  const menuData = makeMenuData([d1, d2]);

  it('F08-AC1: basic total price after adding items', () => {
    let s = makeState({ menuData });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 2 } } });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd2', qty: 1 } } });
    expect(totalPrice(s)).toBe(120 * 2 + 80 * 1);
  });

  it('F08-AC1: quantity change recalculates total', () => {
    let s = makeState({ menuData });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 1 } } });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd2', qty: 1 } } });
    expect(totalPrice(s)).toBe(120 + 80); // 200

    // Update d1 qty to 3 (APPLY_ORDER_ACTION add sets target qty)
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'd1', qty: 3 } } });
    expect(totalPrice(s)).toBe(120 * 3 + 80 * 1); // 440
  });

  it('F08-AC1: item with no price treated as 0 in total', () => {
    const noPriceItem = makeMenuItem('np');
    const pricedItem = makeMenuItem('p', 50);
    const md = makeMenuData([noPriceItem, pricedItem]);
    let s = makeState({ menuData: md });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'np', qty: 2 } } });
    s = appReducer(s, { type: 'APPLY_ORDER_ACTION', payload: { orderAction: 'add', add: { dishId: 'p', qty: 1 } } });
    expect(totalPrice(s)).toBe(50);
  });

  it('F08-AC1: empty order -> total is 0', () => {
    expect(totalPrice(makeState())).toBe(0);
  });
});
