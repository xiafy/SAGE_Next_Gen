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
