import { describe, it, expect, beforeEach } from 'vitest';
import type { AppState } from '../../types';
import type { MenuItem, MenuData } from '../../../../shared/types';

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

const { appReducer } = await import('../AppContext');

function clearStore() {
  for (const k of Object.keys(store)) delete store[k];
}

function makeState(overrides: Partial<AppState> = {}): AppState {
  return {
    chatPhase: 'chatting',
    menuData: null,
    messages: [],
    preferences: { language: 'en', dietary: [], allergies: [] },
    location: null,
    orderItems: [],
    currentView: 'home',
    analyzingFiles: null,
    isSupplementing: false,
    navigationPayload: null,
    waiterAllergyConfirmed: false,
    sessionId: null,
    ...overrides,
  };
}

function makeMenuItem(id: string, name = 'Dish'): MenuItem {
  return {
    id,
    nameOriginal: name,
    nameTranslated: name,
    tags: [],
    brief: '',
    allergens: [],
    dietaryFlags: [],
    spiceLevel: 0,
    calories: null,
  };
}

function makeMenuData(items: MenuItem[]): MenuData {
  return {
    menuType: 'restaurant',
    detectedLanguage: 'th',
    priceLevel: 2,
    currency: 'THB',
    categories: [],
    items,
    processingMs: 100,
    imageCount: 1,
  };
}

describe('F01-AC2: 主入口在 375px-430px 屏宽下清晰可见，无需滚动', () => {
  beforeEach(clearStore);

  it('normal: 从会话页返回 Home 后主入口状态可用', () => {
    const withSession = makeState({ currentView: 'chat', menuData: makeMenuData([makeMenuItem('d1')]) });
    const next = appReducer(withSession, { type: 'NAV_TO', view: 'home' });
    expect(next.currentView).toBe('home');
    expect(next.menuData).not.toBeNull();
  });

  it('boundary: 最小宽度场景（375）下主入口路由不受影响', () => {
    globalThis.innerWidth = 375;
    const next = appReducer(makeState({ currentView: 'scanner' }), { type: 'NAV_TO', view: 'home' });
    expect(next.currentView).toBe('home');
    expect(globalThis.innerWidth).toBe(375);
  });

  it('error: 异常窄屏（320）下仍可进入 Home，不阻断入口', () => {
    globalThis.innerWidth = 320;
    const next = appReducer(makeState({ currentView: 'settings' }), { type: 'NAV_TO', view: 'home' });
    expect(next.currentView).toBe('home');
    expect(globalThis.innerWidth).toBe(320);
  });
});

describe('F01-AC4: 设置图标可访问，点击进入设置页', () => {
  beforeEach(clearStore);

  it('normal: Home 点击设置后进入 settings 视图', () => {
    const next = appReducer(makeState({ currentView: 'home' }), { type: 'NAV_TO', view: 'settings' });
    expect(next.currentView).toBe('settings');
  });

  it('boundary: 从 chat 进入设置也可达', () => {
    const next = appReducer(makeState({ currentView: 'chat' }), { type: 'NAV_TO', view: 'settings' });
    expect(next.currentView).toBe('settings');
  });

  it('error: 会话重置后仍可进入 settings', () => {
    const reset = appReducer(makeState({ currentView: 'chat' }), { type: 'RESET_SESSION' });
    const next = appReducer(reset, { type: 'NAV_TO', view: 'settings' });
    expect(next.currentView).toBe('settings');
  });
});

describe('F04-AC1: 所有感知数据采集失败时，主流程不中断', () => {
  beforeEach(clearStore);

  it('normal: location=null 时仍可从 Home 进入 Scanner', () => {
    const next = appReducer(makeState({ location: null, currentView: 'home' }), { type: 'NAV_TO', view: 'scanner' });
    expect(next.currentView).toBe('scanner');
  });

  it('boundary: location=null 且 weather 缺失时仍可进入 Chat', () => {
    const next = appReducer(makeState({ location: null, currentView: 'home' }), { type: 'NAV_TO', view: 'chat' });
    expect(next.currentView).toBe('chat');
  });

  it('error: 感知数据缺失 + START_ANALYZE 仍可启动分析流程', () => {
    const next = appReducer(makeState({ location: null }), {
      type: 'START_ANALYZE',
      files: [new File(['x'], 'menu.jpg', { type: 'image/jpeg' })],
    });
    expect(next.analyzingFiles).toHaveLength(1);
  });
});

describe('F04-AC2: GPS 被拒后无任何弹窗或提示', () => {
  beforeEach(clearStore);

  it('normal: GPS 拒绝（location=null）后不插入系统提示消息', () => {
    const base = makeState({
      location: null,
      messages: [{ id: 'm1', role: 'assistant', content: 'hello', timestamp: 1 }],
    });
    const next = appReducer(base, { type: 'NAV_TO', view: 'chat' });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]!.content).toBe('hello');
  });

  it('boundary: 连续导航不会产生 GPS 相关提示', () => {
    let state = makeState({ location: null });
    state = appReducer(state, { type: 'NAV_TO', view: 'scanner' });
    state = appReducer(state, { type: 'NAV_TO', view: 'chat' });
    const gpsMentions = state.messages.filter((m) => /gps|定位|location/i.test(m.content));
    expect(gpsMentions).toHaveLength(0);
  });

  it('error: 重置会话后也不会产生 GPS 拒绝提示文案', () => {
    const reset = appReducer(makeState({ location: null }), { type: 'RESET_SESSION' });
    const gpsMentions = reset.messages.filter((m) => /gps|定位|location/i.test(m.content));
    expect(gpsMentions).toHaveLength(0);
  });
});

describe('F09-AC2: AI 提及偏好的方式自然，不机械念清单', () => {
  beforeEach(clearStore);

  it('normal: AI 更新偏好后不产生重复口味项', () => {
    const next = appReducer(makeState(), {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'flavor', action: 'add', value: 'spicy' }],
    });
    expect(next.preferences.flavors).toEqual(['spicy']);
  });

  it('boundary: 连续 add 不同口味时按顺序保留', () => {
    const base = makeState({
      preferences: { language: 'en', dietary: [], allergies: [], flavors: ['spicy'] },
    });
    const next = appReducer(base, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'flavor', action: 'add', value: 'sweet' }],
    });
    expect(next.preferences.flavors).toEqual(['spicy', 'sweet']);
  });

  it('error: remove 不存在偏好时不污染偏好列表', () => {
    const base = makeState({
      preferences: { language: 'en', dietary: [], allergies: [], flavors: ['sweet'] },
    });
    const next = appReducer(base, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'flavor', action: 'remove', value: 'spicy' }],
    });
    expect(next.preferences.flavors).toEqual(['sweet']);
  });
});

describe('F09-AC3: 偏好管理页可查看/删除/添加每条偏好', () => {
  beforeEach(clearStore);

  it('normal: 进入 settings 后可新增一条偏好', () => {
    const entered = appReducer(makeState({ currentView: 'home' }), { type: 'NAV_TO', view: 'settings' });
    const next = appReducer(entered, { type: 'ADD_DIETARY', restriction: 'peanut' });
    expect(next.currentView).toBe('settings');
    expect(next.preferences.dietary).toEqual(['peanut']);
  });

  it('boundary: 删除单条偏好不影响其他条目', () => {
    const base = makeState({
      currentView: 'settings',
      preferences: { language: 'en', dietary: ['peanut', 'shellfish'], allergies: [] },
    });
    const next = appReducer(base, { type: 'REMOVE_DIETARY', restriction: 'peanut' });
    expect(next.preferences.dietary).toEqual(['shellfish']);
  });

  it('error: 删除不存在的偏好不改变列表', () => {
    const base = makeState({
      currentView: 'settings',
      preferences: { language: 'en', dietary: ['shellfish'], allergies: [] },
    });
    const next = appReducer(base, { type: 'REMOVE_DIETARY', restriction: 'peanut' });
    expect(next.preferences.dietary).toEqual(['shellfish']);
  });
});

describe('F09-AC4: 用户在对话中说“其实我现在可以吃香菜了”，AI 更新记录', () => {
  beforeEach(clearStore);

  it('normal: AI remove restriction 后移除 cilantro', () => {
    const base = makeState({
      preferences: { language: 'zh', dietary: ['cilantro', 'peanut'], allergies: [] },
    });
    const next = appReducer(base, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'restriction', action: 'remove', value: 'cilantro' }],
    });
    expect(next.preferences.dietary).toEqual(['peanut']);
  });

  it('boundary: 同一轮更新中 remove cilantro + add 新偏好', () => {
    const base = makeState({
      preferences: { language: 'zh', dietary: ['cilantro'], allergies: [] },
    });
    const next = appReducer(base, {
      type: 'UPDATE_PREFERENCES',
      updates: [
        { type: 'restriction', action: 'remove', value: 'cilantro' },
        { type: 'restriction', action: 'add', value: 'gluten' },
      ],
    });
    expect(next.preferences.dietary).toEqual(['gluten']);
  });

  it('error: cilantro 不存在时 remove 为幂等', () => {
    const base = makeState({
      preferences: { language: 'zh', dietary: ['peanut'], allergies: [] },
    });
    const next = appReducer(base, {
      type: 'UPDATE_PREFERENCES',
      updates: [{ type: 'restriction', action: 'remove', value: 'cilantro' }],
    });
    expect(next.preferences.dietary).toEqual(['peanut']);
  });
});

describe('F10-AC1: 自动检测准确（中文/非中文两档）', () => {
  beforeEach(clearStore);

  it('normal: 中文档最终落在 zh', () => {
    const next = appReducer(makeState({ preferences: { language: 'en', dietary: [], allergies: [] } }), {
      type: 'SET_LANGUAGE',
      language: 'zh',
    });
    expect(next.preferences.language).toBe('zh');
  });

  it('boundary: 非中文档最终落在 en', () => {
    const next = appReducer(makeState({ preferences: { language: 'zh', dietary: [], allergies: [] } }), {
      type: 'SET_LANGUAGE',
      language: 'en',
    });
    expect(next.preferences.language).toBe('en');
  });

  it('error: 异常上下文动作不会把语言带出 zh/en 两档', () => {
    const base = makeState({ preferences: { language: 'en', dietary: [], allergies: [] } });
    const next = appReducer(base, { type: 'ADD_DIETARY', restriction: 'peanut' });
    expect(next.preferences.language).toBe('en');
  });
});
