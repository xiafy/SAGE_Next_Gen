import { createContext, useContext, useReducer, type ReactNode } from 'react';
import React from 'react';
import type { MenuItem, OrderAction } from '../../../shared/types';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
}

export interface OrderState {
  items: Map<string, OrderItem>;
  menuData: MenuItem[] | null;
}

type OrderActionMsg =
  | { type: 'ADD_ITEM'; dishId: string; qty?: number }
  | { type: 'REMOVE_ITEM'; dishId: string }
  | { type: 'SET_QTY'; dishId: string; qty: number }
  | { type: 'CLEAR' }
  | { type: 'APPLY_ORDER_ACTION'; action: OrderAction }
  | { type: 'SET_MENU_DATA'; menuData: MenuItem[] };

// ─────────────────────────────────────────────
// Reducer helpers
// ─────────────────────────────────────────────

function findMenuItem(state: OrderState, dishId: string): MenuItem | undefined {
  return state.menuData?.find(item => item.id === dishId);
}

function addItem(state: OrderState, dishId: string, qty: number): OrderState {
  const menuItem = findMenuItem(state, dishId);
  if (!menuItem) return state;
  const newItems = new Map(state.items);
  newItems.set(dishId, { menuItem, quantity: qty });
  return { ...state, items: newItems };
}

function removeItem(state: OrderState, dishId: string): OrderState {
  if (!state.items.has(dishId)) return state;
  const newItems = new Map(state.items);
  newItems.delete(dishId);
  return { ...state, items: newItems };
}

// ─────────────────────────────────────────────
// Reducer
// ─────────────────────────────────────────────

function orderReducer(state: OrderState, action: OrderActionMsg): OrderState {
  switch (action.type) {
    case 'ADD_ITEM':
      return addItem(state, action.dishId, action.qty ?? 1);

    case 'REMOVE_ITEM':
      return removeItem(state, action.dishId);

    case 'SET_QTY': {
      if (action.qty <= 0) return removeItem(state, action.dishId);
      const existing = state.items.get(action.dishId);
      if (!existing) return addItem(state, action.dishId, action.qty);
      const newItems = new Map(state.items);
      newItems.set(action.dishId, { ...existing, quantity: action.qty });
      return { ...state, items: newItems };
    }

    case 'CLEAR':
      return { ...state, items: new Map() };

    case 'APPLY_ORDER_ACTION': {
      const oa = action.action;
      switch (oa.orderAction) {
        case 'add': {
          if (!oa.add) return state;
          return addItem(state, oa.add.dishId, oa.add.qty);
        }
        case 'remove': {
          if (!oa.remove) return state;
          return removeItem(state, oa.remove.dishId);
        }
        case 'replace': {
          let next = state;
          if (oa.remove) next = removeItem(next, oa.remove.dishId);
          if (oa.add) next = addItem(next, oa.add.dishId, oa.add.qty);
          return next;
        }
        default:
          return state;
      }
    }

    case 'SET_MENU_DATA':
      return { ...state, menuData: action.menuData };
  }
}

// ─────────────────────────────────────────────
// Context + Provider + Hook
// ─────────────────────────────────────────────

const initialState: OrderState = {
  items: new Map(),
  menuData: null,
};

const OrderContext = createContext<{
  state: OrderState;
  dispatch: React.Dispatch<OrderActionMsg>;
}>({
  state: initialState,
  dispatch: () => undefined,
});

export function OrderProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(orderReducer, initialState);
  return React.createElement(OrderContext.Provider, { value: { state, dispatch } }, children);
}

export function useOrder() {
  return useContext(OrderContext);
}
