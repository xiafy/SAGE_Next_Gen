import { createContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, AppAction } from '../types';

const STORAGE_KEY = 'sage_preferences_v1';

function getInitialPreferences() {
  const prefs: { language: 'zh' | 'en'; dietary: string[]; flavors?: string[]; other?: string[] } = {
    language: 'en',
    dietary: [],
  };

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.language === 'zh' || parsed?.language === 'en') {
        prefs.language = parsed.language;
      }
      if (Array.isArray(parsed?.dietary)) {
        prefs.dietary = parsed.dietary;
      }
      if (Array.isArray(parsed?.flavors)) {
        prefs.flavors = parsed.flavors;
      }
      if (Array.isArray(parsed?.other)) {
        prefs.other = parsed.other;
      }
    }
  } catch {
    // ignore
  }

  // 系统语言检测（仅当 localStorage 无值时）
  if (!localStorage.getItem(STORAGE_KEY)) {
    const sysLang = navigator.language.toLowerCase();
    if (sysLang.startsWith('zh') || sysLang === 'zh-cn' || sysLang === 'zh-tw') {
      prefs.language = 'zh';
    }
  }

  return prefs;
}

const initialState: AppState = {
  chatPhase: 'pre_chat',
  menuData: null,
  messages: [],
  preferences: getInitialPreferences(),
  location: null,
  orderItems: [],
  currentView: 'home',
  analyzingFiles: null,
  isSupplementing: false,
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NAV_TO':
      return { ...state, currentView: action.view };

    case 'SET_MENU_DATA':
      return {
        ...state,
        menuData: action.data,
        // Path C（补充菜单）时保持 chatting，不触发 handoff
        chatPhase: state.isSupplementing ? 'chatting' : 'handing_off',
      };

    case 'SET_CHAT_PHASE':
      return { ...state, chatPhase: action.phase };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.message] };

    case 'ADD_TO_ORDER': {
      const existing = state.orderItems.find(
        (oi) => oi.menuItem.id === action.item.id,
      );
      if (existing) {
        return {
          ...state,
          orderItems: state.orderItems.map((oi) =>
            oi.menuItem.id === action.item.id
              ? { ...oi, quantity: oi.quantity + 1 }
              : oi,
          ),
        };
      }
      return {
        ...state,
        orderItems: [...state.orderItems, { menuItem: action.item, quantity: 1 }],
      };
    }

    case 'REMOVE_FROM_ORDER':
      return {
        ...state,
        orderItems: state.orderItems.filter(
          (oi) => oi.menuItem.id !== action.itemId,
        ),
      };

    case 'UPDATE_ORDER_QTY': {
      if (action.quantity <= 0) {
        return {
          ...state,
          orderItems: state.orderItems.filter(
            (oi) => oi.menuItem.id !== action.itemId,
          ),
        };
      }
      return {
        ...state,
        orderItems: state.orderItems.map((oi) =>
          oi.menuItem.id === action.itemId
            ? { ...oi, quantity: action.quantity }
            : oi,
        ),
      };
    }

    case 'UPDATE_PREFERENCES': {
      const updated = { ...state.preferences };
      for (const p of action.updates) {
        if (p.action === 'add') {
          if (p.type === 'restriction' && !updated.dietary.includes(p.value)) {
            updated.dietary = [...updated.dietary, p.value];
          } else if (p.type === 'flavor') {
            updated.flavors = [...(updated.flavors ?? []), p.value];
          } else if (p.type === 'other') {
            updated.other = [...(updated.other ?? []), p.value];
          }
        } else if (p.action === 'remove') {
          if (p.type === 'restriction') {
            updated.dietary = updated.dietary.filter((d) => d !== p.value);
          } else if (p.type === 'flavor') {
            updated.flavors = (updated.flavors ?? []).filter((f) => f !== p.value);
          } else if (p.type === 'other') {
            updated.other = (updated.other ?? []).filter((o) => o !== p.value);
          }
        }
      }
      return { ...state, preferences: updated };
    }

    case 'RESET_SESSION':
      return {
        ...initialState,
        preferences: {
          ...initialState.preferences,
          language: state.preferences.language,
        },
      };

    case 'SET_LANGUAGE':
      return {
        ...state,
        preferences: { ...state.preferences, language: action.language },
      };

    case 'ADD_DIETARY':
      if (state.preferences.dietary.includes(action.restriction)) {
        return state;
      }
      return {
        ...state,
        preferences: {
          ...state.preferences,
          dietary: [...state.preferences.dietary, action.restriction],
        },
      };

    case 'REMOVE_DIETARY':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          dietary: state.preferences.dietary.filter((d) => d !== action.restriction),
        },
      };

    case 'START_ANALYZE':
      return {
        ...state,
        analyzingFiles: action.files,
        // 只在首次进入（非 Path C 补充菜单）时切 pre_chat
        // Path C 时 chatPhase 已经是 chatting，不应覆盖
        chatPhase: action.files.length > 0 && !state.isSupplementing
          ? 'pre_chat'
          : state.chatPhase,
      };

    case 'SET_SUPPLEMENTING':
      return {
        ...state,
        isSupplementing: action.value,
      };

    case 'CLEAR_ANALYZING_FILES':
      return {
        ...state,
        analyzingFiles: null,
      };

    case 'SET_LOCATION':
      return {
        ...state,
        location: action.location,
      };
  }
}

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => undefined,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Persist preferences to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.preferences));
    } catch {
      // ignore storage errors
    }
  }, [state.preferences]);

  // Silent geolocation request for coarse location (city-level context)
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Math.round(position.coords.latitude * 100) / 100;
        const lng = Math.round(position.coords.longitude * 100) / 100;
        dispatch({ type: 'SET_LOCATION', location: { lat, lng } });
      },
      () => {
        // DEC-021: ignore all failures (including permission denied) silently
      },
      {
        enableHighAccuracy: false,
        timeout: 8000,
        maximumAge: 10 * 60 * 1000,
      },
    );
  }, []);

  return (
    <AppContext value={{ state, dispatch }}>
      {children}
    </AppContext>
  );
}
