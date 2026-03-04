import { describe, it, expect } from 'vitest';
import { formatPrice } from '../formatPrice';

describe('formatPrice', () => {
  it('CNY → ¥100', () => {
    expect(formatPrice(100, 'CNY')).toBe('¥100');
  });

  it('THB → ฿100', () => {
    expect(formatPrice(100, 'THB')).toBe('฿100');
  });

  it('USD → $100', () => {
    expect(formatPrice(100, 'USD')).toBe('$100');
  });

  it('EUR → €100', () => {
    expect(formatPrice(100, 'EUR')).toBe('€100');
  });

  it('JPY → ¥100', () => {
    expect(formatPrice(100, 'JPY')).toBe('¥100');
  });

  it('0 price → ¥0', () => {
    expect(formatPrice(0, 'CNY')).toBe('¥0');
  });

  it('unknown currency → fallback "100 XXX "', () => {
    // Unknown code becomes "XXX 100"
    expect(formatPrice(100, 'XXX')).toBe('XXX 100');
  });

  it('no currency → defaults to CNY (¥)', () => {
    expect(formatPrice(100)).toBe('¥100');
  });
});

describe('F08-AC1: formatPrice used in total price display', () => {
  it('F08-AC1: total price formats correctly with THB currency', () => {
    const items = [
      { price: 120, quantity: 2 },
      { price: 80, quantity: 1 },
    ];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(formatPrice(total, 'THB')).toBe('฿320');
  });

  it('F08-AC1: total price formats correctly with USD', () => {
    const items = [
      { price: 15, quantity: 3 },
      { price: 22, quantity: 2 },
    ];
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    expect(formatPrice(total, 'USD')).toBe('$89');
  });

  it('F08-AC1: quantity change updates formatted total', () => {
    const beforeTotal = 100 * 1 + 200 * 1;
    expect(formatPrice(beforeTotal, 'CNY')).toBe('¥300');

    const afterTotal = 100 * 3 + 200 * 1;
    expect(formatPrice(afterTotal, 'CNY')).toBe('¥500');
  });
});
