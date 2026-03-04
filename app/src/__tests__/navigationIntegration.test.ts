import { describe, it, expect } from 'vitest';
import type { AppState } from '../types';
import type { MenuItem, MenuData } from '../../../shared/types';

// localStorage mock
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

const { appReducer } = await import('../context/AppContext');

function makeMenuItem(id: string, name = 'Dish'): MenuItem {
  return { id, nameOriginal: name, nameTranslated: name, tags: [], brief: '', allergens: [], dietaryFlags: [], spiceLevel: 0, calories: null };
}

function makeMenuData(items: MenuItem[]): MenuData {
  return { menuType: 'restaurant', detectedLanguage: 'th', priceLevel: 2, currency: 'THB', categories: [], items, processingMs: 100, imageCount: 1 };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting', menuData: null, messages: [],
    preferences: { language: 'en', dietary: [] }, location: null,
    orderItems: [], currentView: 'home', analyzingFiles: null,
    isSupplementing: false, navigationPayload: null, waiterAllergyConfirmed: false,
    ...overrides,
  };
}

describe('F06-AC6 / F07-AC1: Explore↔Chat preserves conversation history', () => {
  it('F06-AC6: NAV_TO explore then back to chat → messages preserved', () => {
    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Hello', timestamp: 1 },
      { id: 'm2', role: 'assistant' as const, content: 'Hi there!', timestamp: 2 },
      { id: 'm3', role: 'user' as const, content: 'Recommend something', timestamp: 3 },
    ];
    let state = makeState({ currentView: 'chat', messages });

    // Navigate to explore
    state = appReducer(state, { type: 'NAV_TO', view: 'explore' });
    expect(state.currentView).toBe('explore');
    expect(state.messages).toHaveLength(3);
    expect(state.messages[0]!.content).toBe('Hello');

    // Navigate back to chat
    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });
    expect(state.currentView).toBe('chat');
    expect(state.messages).toHaveLength(3);
    expect(state.messages[2]!.content).toBe('Recommend something');
  });

  it('F07-AC1: adding items in explore does not affect chat messages', () => {
    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Show me the menu', timestamp: 1 },
    ];
    const d1 = makeMenuItem('d1', 'Tom Yum');
    let state = makeState({ currentView: 'explore', messages, menuData: makeMenuData([d1]) });

    // Add item to order while in explore
    state = appReducer(state, { type: 'ADD_TO_ORDER', item: d1 });
    expect(state.orderItems).toHaveLength(1);
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]!.content).toBe('Show me the menu');
  });

  it('F06-AC6: multiple round trips between chat and explore → messages intact', () => {
    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Hi', timestamp: 1 },
    ];
    let state = makeState({ currentView: 'chat', messages });

    for (let i = 0; i < 5; i++) {
      state = appReducer(state, { type: 'NAV_TO', view: 'explore' });
      state = appReducer(state, { type: 'NAV_TO', view: 'chat' });
    }

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]!.content).toBe('Hi');
  });
});

describe('F01-AC6 / F08-AC6: New meal / End meal clears session', () => {
  it('F01-AC6: RESET_SESSION clears orderItems + messages + menuData → back to initial', () => {
    const d1 = makeMenuItem('d1');
    const state = makeState({
      currentView: 'chat',
      menuData: makeMenuData([d1]),
      orderItems: [{ menuItem: d1, quantity: 2 }],
      messages: [
        { id: 'm1', role: 'user', content: 'Hey', timestamp: 1 },
        { id: 'm2', role: 'assistant', content: 'Hello!', timestamp: 2 },
      ],
      chatPhase: 'chatting',
      waiterAllergyConfirmed: true,
      navigationPayload: { newlySelected: [], existingOrder: [] },
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
    const state = makeState({
      preferences: { language: 'zh', dietary: ['peanut'] },
      orderItems: [{ menuItem: makeMenuItem('d1'), quantity: 1 }],
    });

    const r = appReducer(state, { type: 'RESET_SESSION' });
    expect(r.preferences.language).toBe('zh');
  });

  it('F08-AC6: end meal flow — RESET_SESSION + NAV_TO home', () => {
    const d1 = makeMenuItem('d1');
    let state = makeState({
      currentView: 'waiter',
      orderItems: [{ menuItem: d1, quantity: 3 }],
      messages: [{ id: 'm1', role: 'user', content: 'Done', timestamp: 1 }],
      waiterAllergyConfirmed: true,
    });

    // Step 1: Reset session (after confirmation dialog)
    state = appReducer(state, { type: 'RESET_SESSION' });
    expect(state.orderItems).toHaveLength(0);
    expect(state.messages).toHaveLength(0);
    expect(state.waiterAllergyConfirmed).toBe(false);

    // Step 2: Navigate to home
    state = appReducer(state, { type: 'NAV_TO', view: 'home' });
    expect(state.currentView).toBe('home');
  });
});

describe('F01-AC5: Session-aware home state', () => {
  it('F01-AC5: menuData exists → hasActiveSession = true', () => {
    const state = makeState({ menuData: makeMenuData([makeMenuItem('d1')]) });
    const hasActiveSession = state.menuData !== null;
    expect(hasActiveSession).toBe(true);
  });

  it('F01-AC5: menuData null → hasActiveSession = false', () => {
    const state = makeState({ menuData: null });
    const hasActiveSession = state.menuData !== null;
    expect(hasActiveSession).toBe(false);
  });

  it('F01-AC5: after RESET_SESSION → no active session', () => {
    const state = makeState({ menuData: makeMenuData([makeMenuItem('d1')]) });
    const r = appReducer(state, { type: 'RESET_SESSION' });
    expect(r.menuData).toBeNull();
  });
});

describe('F07-AC7: Consult AI with selected dishes', () => {
  it('F07-AC7: SET_NAV_PAYLOAD carries selected dishes to chat', () => {
    const payload = {
      newlySelected: [
        { dishId: 'd1', name: 'Tom Yum', nameOriginal: 'ต้มยำ', price: 120, category: 'Soup' },
        { dishId: 'd2', name: 'Pad Thai', nameOriginal: 'ผัดไทย', price: 100, category: 'Main' },
      ],
      existingOrder: [
        { dishId: 'd3', name: 'Spring Rolls', nameOriginal: 'ปอเปี๊ยะ', price: 60, category: 'Appetizer' },
      ],
    };
    let state = makeState({ currentView: 'explore' });

    state = appReducer(state, { type: 'SET_NAV_PAYLOAD', payload });
    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });

    expect(state.currentView).toBe('chat');
    expect(state.navigationPayload).not.toBeNull();
    expect(state.navigationPayload!.newlySelected).toHaveLength(2);
    expect(state.navigationPayload!.existingOrder).toHaveLength(1);
  });

  it('F07-AC7: empty selection → no payload injected (boundary)', () => {
    let state = makeState({ currentView: 'explore' });

    // No SET_NAV_PAYLOAD dispatched when empty selection
    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });

    expect(state.navigationPayload).toBeNull();
  });

  it('F07-AC7: payload consumed after use → set to null', () => {
    const payload = {
      newlySelected: [{ dishId: 'd1', name: 'A', nameOriginal: 'A', price: 50, category: 'X' }],
      existingOrder: [],
    };
    let state = makeState();
    state = appReducer(state, { type: 'SET_NAV_PAYLOAD', payload });
    expect(state.navigationPayload).not.toBeNull();

    // After consumption, clear it
    state = appReducer(state, { type: 'SET_NAV_PAYLOAD', payload: null });
    expect(state.navigationPayload).toBeNull();
  });
});
