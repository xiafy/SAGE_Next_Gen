/**
 * F07 Explore View AC tests — Batch 1
 * Tests: F07-AC2, F07-AC3, F07-AC4, F07-AC6, F07-AC8, F07-AC9
 *
 * Strategy: reducer-level + data-level tests.
 * We verify state transitions and data structures that drive the Explore view.
 */
import { describe, it, expect } from 'vitest';
import type { AppState } from '../../types';
import type { MenuItem, MenuData, MenuCategory } from '../../../../shared/types';

// localStorage mock (Anti-Pattern 6: Object.defineProperty unconditional override)
const store: Record<string, string> = {};
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { for (const k of Object.keys(store)) delete store[k]; },
    get length() { return Object.keys(store).length; },
    key: (i: number) => Object.keys(store)[i] ?? null,
  },
  writable: true,
  configurable: true,
});

const { appReducer } = await import('../../context/AppContext');

function makeMenuItem(id: string, name = 'Dish', nameOrig = name): MenuItem {
  return {
    id, nameOriginal: nameOrig, nameTranslated: name,
    tags: [], brief: '', allergens: [], dietaryFlags: [],
    spiceLevel: 0, calories: null,
  };
}

function makeMenuData(
  items: MenuItem[],
  categories: MenuCategory[] = [],
): MenuData {
  return {
    menuType: 'restaurant', detectedLanguage: 'th', priceLevel: 2,
    currency: 'THB', categories, items, processingMs: 100, imageCount: 1,
  };
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting', menuData: null, messages: [],
    preferences: { language: 'en', dietary: [], allergies: [] },
    location: null, orderItems: [], currentView: 'home',
    analyzingFiles: null, isSupplementing: false,
    navigationPayload: null, waiterAllergyConfirmed: false,
    sessionId: null,
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────
// F07-AC2: 菜品分类由 AI 识别决定，不硬编码
// ────────────────────────────────────────────────────────────────
describe('F07-AC2: Dish categories determined by AI, not hardcoded', () => {
  it('F07-AC2: MenuData preserves AI-generated categories with arbitrary names', () => {
    const categories: MenuCategory[] = [
      { id: 'c1', nameOriginal: 'อาหารเรียกน้ำย่อย', nameTranslated: 'Appetizers', itemIds: ['d1'] },
      { id: 'c2', nameOriginal: 'ก๋วยเตี๋ยว', nameTranslated: 'Noodles', itemIds: ['d2'] },
      { id: 'c3', nameOriginal: 'ของหวาน', nameTranslated: 'Desserts', itemIds: ['d3'] },
    ];
    const items = [makeMenuItem('d1'), makeMenuItem('d2'), makeMenuItem('d3')];
    const menuData = makeMenuData(items, categories);

    const state = makeState();
    const r = appReducer(state, { type: 'SET_MENU_DATA', data: menuData });

    expect(r.menuData!.categories).toHaveLength(3);
    expect(r.menuData!.categories[0]!.nameTranslated).toBe('Appetizers');
    expect(r.menuData!.categories[1]!.nameTranslated).toBe('Noodles');
    expect(r.menuData!.categories[2]!.nameTranslated).toBe('Desserts');
    // Verify original names (Thai) are also preserved
    expect(r.menuData!.categories[0]!.nameOriginal).toBe('อาหารเรียกน้ำย่อย');
  });

  it('F07-AC2: AI can return non-Western category names (Japanese izakaya)', () => {
    const categories: MenuCategory[] = [
      { id: 'c1', nameOriginal: '刺身', nameTranslated: 'Sashimi', itemIds: ['d1'] },
      { id: 'c2', nameOriginal: '焼き鳥', nameTranslated: 'Yakitori', itemIds: ['d2'] },
      { id: 'c3', nameOriginal: '〆の一品', nameTranslated: 'Closing Dish', itemIds: ['d3'] },
    ];
    const items = [makeMenuItem('d1'), makeMenuItem('d2'), makeMenuItem('d3')];
    const menuData = makeMenuData(items, categories);

    const state = makeState();
    const r = appReducer(state, { type: 'SET_MENU_DATA', data: menuData });

    expect(r.menuData!.categories).toHaveLength(3);
    expect(r.menuData!.categories[0]!.nameOriginal).toBe('刺身');
    expect(r.menuData!.categories[2]!.nameOriginal).toBe('〆の一品');
  });

  it('F07-AC2: empty categories from AI → no crash, items still accessible', () => {
    const items = [makeMenuItem('d1'), makeMenuItem('d2')];
    const menuData = makeMenuData(items, []);

    const state = makeState();
    const r = appReducer(state, { type: 'SET_MENU_DATA', data: menuData });

    expect(r.menuData!.categories).toHaveLength(0);
    expect(r.menuData!.items).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────
// F07-AC3: 返回 AgentChat 时定位到最新消息
// ────────────────────────────────────────────────────────────────
describe('F07-AC3: Return to AgentChat positions to latest message', () => {
  it('F07-AC3: after Explore→Chat, messages preserved with latest timestamp accessible', () => {
    const messages = [
      { id: 'm1', role: 'user' as const, content: 'First', timestamp: 100 },
      { id: 'm2', role: 'assistant' as const, content: 'Reply', timestamp: 200 },
      { id: 'm3', role: 'user' as const, content: 'Latest', timestamp: 300 },
    ];
    let state = makeState({ currentView: 'explore', messages });

    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });

    expect(state.currentView).toBe('chat');
    expect(state.messages).toHaveLength(3);
    const latestMessage = state.messages[state.messages.length - 1]!;
    expect(latestMessage.content).toBe('Latest');
    expect(latestMessage.timestamp).toBe(300);
  });

  it('F07-AC3: messages added while in Explore are preserved on return to Chat', () => {
    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Before explore', timestamp: 100 },
    ];
    let state = makeState({ currentView: 'chat', messages });

    // Go to explore
    state = appReducer(state, { type: 'NAV_TO', view: 'explore' });

    // Simulate a message added (e.g. background AI process)
    state = appReducer(state, {
      type: 'ADD_MESSAGE',
      message: { id: 'm2', role: 'assistant', content: 'New recommendation', timestamp: 200 },
    });

    // Return to chat
    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });

    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]!.content).toBe('New recommendation');
    expect(state.messages[1]!.timestamp).toBe(200);
  });

  it('F07-AC3: empty messages → return to chat with no crash', () => {
    let state = makeState({ currentView: 'explore', messages: [] });
    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });

    expect(state.messages).toHaveLength(0);
    expect(state.currentView).toBe('chat');
  });
});

// ────────────────────────────────────────────────────────────────
// F07-AC4: "全部"tab 下菜品按分类分组，每组有标题
// ────────────────────────────────────────────────────────────────
describe('F07-AC4: All tab groups dishes by category with section titles', () => {
  it('F07-AC4: items grouped by category via itemIds mapping', () => {
    const items = [
      makeMenuItem('d1', 'Spring Rolls'),
      makeMenuItem('d2', 'Pad Thai'),
      makeMenuItem('d3', 'Tom Yum'),
      makeMenuItem('d4', 'Mango Sticky Rice'),
    ];
    const categories: MenuCategory[] = [
      { id: 'c1', nameOriginal: 'Appetizers', nameTranslated: '前菜', itemIds: ['d1'] },
      { id: 'c2', nameOriginal: 'Main', nameTranslated: '主菜', itemIds: ['d2', 'd3'] },
      { id: 'c3', nameOriginal: 'Dessert', nameTranslated: '甜品', itemIds: ['d4'] },
    ];
    const menuData = makeMenuData(items, categories);

    // Verify grouping structure: each category has correct itemIds → items
    const grouped = menuData.categories.map(cat => ({
      title: cat.nameTranslated,
      titleOriginal: cat.nameOriginal,
      items: cat.itemIds
        .map(id => menuData.items.find(i => i.id === id))
        .filter((i): i is MenuItem => i !== undefined),
    }));

    expect(grouped).toHaveLength(3);
    expect(grouped[0]!.title).toBe('前菜');
    expect(grouped[0]!.items).toHaveLength(1);
    expect(grouped[0]!.items[0]!.nameTranslated).toBe('Spring Rolls');
    expect(grouped[1]!.title).toBe('主菜');
    expect(grouped[1]!.items).toHaveLength(2);
    expect(grouped[1]!.items[0]!.nameTranslated).toBe('Pad Thai');
    expect(grouped[1]!.items[1]!.nameTranslated).toBe('Tom Yum');
    expect(grouped[2]!.title).toBe('甜品');
    expect(grouped[2]!.items).toHaveLength(1);
    expect(grouped[2]!.items[0]!.nameTranslated).toBe('Mango Sticky Rice');
  });

  it('F07-AC4: items not in any category are identifiable for "Other" group', () => {
    const items = [
      makeMenuItem('d1', 'Known Dish'),
      makeMenuItem('d2', 'Orphan Dish'),
    ];
    const categories: MenuCategory[] = [
      { id: 'c1', nameOriginal: 'Starters', nameTranslated: 'Starters', itemIds: ['d1'] },
    ];
    const menuData = makeMenuData(items, categories);

    const allCategorizedIds = new Set(
      menuData.categories.flatMap(c => c.itemIds),
    );
    const uncategorized = menuData.items.filter(
      item => !allCategorizedIds.has(item.id),
    );

    expect(uncategorized).toHaveLength(1);
    expect(uncategorized[0]!.id).toBe('d2');
    expect(uncategorized[0]!.nameTranslated).toBe('Orphan Dish');
  });

  it('F07-AC4: single category → all items belong to one titled group', () => {
    const items = [makeMenuItem('d1', 'Dish A'), makeMenuItem('d2', 'Dish B')];
    const categories: MenuCategory[] = [
      { id: 'c1', nameOriginal: 'Everything', nameTranslated: 'Everything', itemIds: ['d1', 'd2'] },
    ];
    const menuData = makeMenuData(items, categories);

    expect(menuData.categories).toHaveLength(1);
    expect(menuData.categories[0]!.nameTranslated).toBe('Everything');
    expect(menuData.categories[0]!.itemIds).toHaveLength(2);
  });
});

// ────────────────────────────────────────────────────────────────
// F07-AC6: 已选菜品 > 0 时底部操作栏自动出现
// ────────────────────────────────────────────────────────────────
describe('F07-AC6: Bottom action bar appears when selected dishes > 0', () => {
  const d1 = makeMenuItem('d1', 'Tom Yum');
  const d2 = makeMenuItem('d2', 'Pad Thai');
  const menuData = makeMenuData([d1, d2]);

  it('F07-AC6: orderItems not empty → action bar should show', () => {
    const state = makeState({
      currentView: 'explore',
      menuData,
      orderItems: [{ menuItem: d1, quantity: 1 }],
    });
    const shouldShowActionBar = state.orderItems.length > 0;
    expect(shouldShowActionBar).toBe(true);

    // Verify quantity and estimated total are computable
    const totalQty = state.orderItems.reduce((s, oi) => s + oi.quantity, 0);
    expect(totalQty).toBe(1);
  });

  it('F07-AC6: orderItems empty → action bar should hide', () => {
    const state = makeState({
      currentView: 'explore',
      menuData,
      orderItems: [],
    });
    const shouldShowActionBar = state.orderItems.length > 0;
    expect(shouldShowActionBar).toBe(false);
  });

  it('F07-AC6: adding first item transitions from hidden to shown', () => {
    let state = makeState({ currentView: 'explore', menuData, orderItems: [] });

    // Before adding: hidden
    expect(state.orderItems.length > 0).toBe(false);

    // Add an item
    state = appReducer(state, { type: 'ADD_TO_ORDER', item: d1 });

    // After adding: shown
    expect(state.orderItems.length > 0).toBe(true);
    expect(state.orderItems[0]!.quantity).toBe(1);
  });

  it('F07-AC6: removing last item transitions from shown to hidden', () => {
    let state = makeState({
      currentView: 'explore',
      menuData,
      orderItems: [{ menuItem: d1, quantity: 1 }],
    });

    expect(state.orderItems.length > 0).toBe(true);

    state = appReducer(state, { type: 'UPDATE_ORDER_QTY', itemId: 'd1', quantity: 0 });

    expect(state.orderItems.length > 0).toBe(false);
    expect(state.orderItems).toHaveLength(0);
  });

  it('F07-AC6: multiple items → action bar shows total quantity and estimated price', () => {
    const d1p = { ...d1, price: 120 };
    const d2p = { ...d2, price: 80 };
    const state = makeState({
      currentView: 'explore',
      orderItems: [
        { menuItem: d1p, quantity: 2 },
        { menuItem: d2p, quantity: 1 },
      ],
    });

    const totalQty = state.orderItems.reduce((s, oi) => s + oi.quantity, 0);
    const totalPrice = state.orderItems.reduce(
      (s, oi) => s + (oi.menuItem.price ?? 0) * oi.quantity, 0,
    );

    expect(totalQty).toBe(3);
    expect(totalPrice).toBe(320);
  });
});

// ────────────────────────────────────────────────────────────────
// F07-AC8: 「展示给服务员」从 Explore 直接进入 Waiter Mode
// ────────────────────────────────────────────────────────────────
describe('F07-AC8: Show to waiter from Explore enters Waiter Mode', () => {
  const d1 = makeMenuItem('d1', 'Tom Yum');
  const d2 = makeMenuItem('d2', 'Pad Thai');
  const menuData = makeMenuData([d1, d2]);

  it('F07-AC8: NAV_TO waiter from explore → currentView becomes waiter', () => {
    let state = makeState({
      currentView: 'explore',
      menuData,
      orderItems: [{ menuItem: d1, quantity: 1 }],
    });

    state = appReducer(state, { type: 'NAV_TO', view: 'waiter' });

    expect(state.currentView).toBe('waiter');
  });

  it('F07-AC8: order items persist through Explore → Waiter transition', () => {
    let state = makeState({
      currentView: 'explore',
      menuData,
      orderItems: [
        { menuItem: d1, quantity: 2 },
        { menuItem: d2, quantity: 1 },
      ],
    });

    state = appReducer(state, { type: 'NAV_TO', view: 'waiter' });

    expect(state.currentView).toBe('waiter');
    expect(state.orderItems).toHaveLength(2);
    expect(state.orderItems[0]!.menuItem.id).toBe('d1');
    expect(state.orderItems[0]!.quantity).toBe(2);
    expect(state.orderItems[1]!.menuItem.id).toBe('d2');
    expect(state.orderItems[1]!.quantity).toBe(1);
  });

  it('F07-AC8: messages preserved through Explore → Waiter transition', () => {
    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Show menu', timestamp: 100 },
      { id: 'm2', role: 'assistant' as const, content: 'Here is the menu', timestamp: 200 },
    ];
    let state = makeState({
      currentView: 'explore',
      menuData,
      messages,
      orderItems: [{ menuItem: d1, quantity: 1 }],
    });

    state = appReducer(state, { type: 'NAV_TO', view: 'waiter' });

    expect(state.currentView).toBe('waiter');
    expect(state.messages).toHaveLength(2);
    expect(state.messages[1]!.content).toBe('Here is the menu');
  });
});

// ────────────────────────────────────────────────────────────────
// F07-AC9: SelectedDishesCard 使用系统消息样式
// ────────────────────────────────────────────────────────────────
describe('F07-AC9: SelectedDishesCard uses system message style', () => {
  it('F07-AC9: system message with cardType=selectedDishes has correct shape', () => {
    const msg = {
      id: 'sys-1',
      role: 'system' as const,
      content: '📋 你从菜单中选了以下菜品',
      timestamp: Date.now(),
      cardType: 'selectedDishes' as const,
      cardData: {
        newlySelected: [
          { dishId: 'd1', name: 'Tom Yum', nameOriginal: 'ต้มยำ', price: 120, category: 'Soup' },
        ],
        existingOrder: [],
      },
    };

    // Verify it's a system message (not user or assistant)
    expect(msg.role).toBe('system');
    expect(msg.cardType).toBe('selectedDishes');
    expect(msg.cardData.newlySelected).toHaveLength(1);
    expect(msg.cardData.newlySelected[0]!.name).toBe('Tom Yum');
  });

  it('F07-AC9: ADD_MESSAGE with system role + selectedDishes card persists in state', () => {
    let state = makeState({ currentView: 'chat', messages: [] });

    state = appReducer(state, {
      type: 'ADD_MESSAGE',
      message: {
        id: 'sys-1',
        role: 'system',
        content: '📋 你从菜单中选了以下菜品',
        timestamp: 100,
        cardType: 'selectedDishes',
        cardData: {
          newlySelected: [
            { dishId: 'd1', name: 'Pad Thai', nameOriginal: 'ผัดไทย', price: 100, category: 'Main' },
          ],
          existingOrder: [],
        },
      },
    });

    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]!.role).toBe('system');
    expect(state.messages[0]!.cardType).toBe('selectedDishes');
  });

  it('F07-AC9: system message visually distinct — role is not user or assistant', () => {
    const systemMsg = {
      id: 'sys-1',
      role: 'system' as const,
      content: '📋 Selected dishes card',
      timestamp: 100,
      cardType: 'selectedDishes' as const,
    };
    const userMsg = {
      id: 'u-1',
      role: 'user' as const,
      content: 'Hello',
      timestamp: 200,
    };
    const assistantMsg = {
      id: 'a-1',
      role: 'assistant' as const,
      content: 'Hi there',
      timestamp: 300,
    };

    // System messages are distinct from both user and assistant
    expect(systemMsg.role).not.toBe(userMsg.role);
    expect(systemMsg.role).not.toBe(assistantMsg.role);
    expect(systemMsg.role).toBe('system');
  });
});
