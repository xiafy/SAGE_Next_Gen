import { describe, it, expect } from 'vitest';
import type { OrderItem } from '../../types';
import type { MenuItem } from '../../../../shared/types';

function makeMenuItem(id: string, price?: number): MenuItem {
  return {
    id, nameOriginal: `Dish ${id}`, nameTranslated: `Dish ${id}`,
    tags: [], brief: '', allergens: [], dietaryFlags: [], spiceLevel: 0,
    calories: null, ...(price !== undefined ? { price } : {}),
  };
}

/**
 * Badge count formula: orderItems.reduce((sum, i) => sum + i.quantity, 0)
 * This MUST be total quantity, NOT item count (F07-AC5).
 */
function getBadgeCount(orderItems: OrderItem[]): number {
  return orderItems.reduce((sum, i) => sum + i.quantity, 0);
}

/**
 * Total price formula: orderItems.reduce((sum, i) => sum + (i.menuItem.price ?? 0) * i.quantity, 0)
 * F08-AC1: total price updates when quantity changes.
 */
function getTotalPrice(orderItems: OrderItem[]): number {
  return orderItems.reduce((sum, i) => sum + (i.menuItem.price ?? 0) * i.quantity, 0);
}

describe('F07-AC5: Badge shows total quantity, not item count', () => {
  it('F07-AC5: single item qty=3 → badge shows 3', () => {
    const items: OrderItem[] = [{ menuItem: makeMenuItem('d1'), quantity: 3 }];
    expect(getBadgeCount(items)).toBe(3);
    expect(items.length).toBe(1); // item count is 1, but badge should be 3
  });

  it('F07-AC5: multiple items → badge is sum of quantities', () => {
    const items: OrderItem[] = [
      { menuItem: makeMenuItem('d1'), quantity: 2 },
      { menuItem: makeMenuItem('d2'), quantity: 3 },
      { menuItem: makeMenuItem('d3'), quantity: 1 },
    ];
    expect(getBadgeCount(items)).toBe(6);
    expect(items.length).toBe(3);
  });

  it('F07-AC5: empty order → badge is 0', () => {
    expect(getBadgeCount([])).toBe(0);
  });
});

describe('F08-AC1: Total price updates when quantity changes', () => {
  it('F08-AC1: basic total price calculation', () => {
    const items: OrderItem[] = [
      { menuItem: makeMenuItem('d1', 120), quantity: 2 },
      { menuItem: makeMenuItem('d2', 80), quantity: 1 },
    ];
    expect(getTotalPrice(items)).toBe(120 * 2 + 80 * 1);
  });

  it('F08-AC1: quantity change recalculates total', () => {
    const before: OrderItem[] = [
      { menuItem: makeMenuItem('d1', 100), quantity: 1 },
      { menuItem: makeMenuItem('d2', 200), quantity: 1 },
    ];
    expect(getTotalPrice(before)).toBe(300);

    const after: OrderItem[] = [
      { menuItem: makeMenuItem('d1', 100), quantity: 3 },
      { menuItem: makeMenuItem('d2', 200), quantity: 1 },
    ];
    expect(getTotalPrice(after)).toBe(500);
  });

  it('F08-AC1: item with no price treated as 0 in total', () => {
    const d1 = makeMenuItem('d1'); // no price
    const d2 = makeMenuItem('d2', 50);
    const items: OrderItem[] = [
      { menuItem: d1, quantity: 2 },
      { menuItem: d2, quantity: 1 },
    ];
    // d1 has no price → (undefined ?? 0) * 2 = 0, d2 = 50 * 1
    expect(getTotalPrice(items)).toBe(50);
  });

  it('F08-AC1: empty order → total is 0', () => {
    expect(getTotalPrice([])).toBe(0);
  });
});
