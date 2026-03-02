/**
 * Simple currency formatting utility (🟡-2)
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '¥',
  JPY: '¥',
  USD: '$',
  EUR: '€',
  GBP: '£',
  THB: '฿',
  KRW: '₩',
  INR: '₹',
  RUB: '₽',
  VND: '₫',
  MYR: 'RM',
  SGD: 'S$',
  HKD: 'HK$',
  TWD: 'NT$',
  AUD: 'A$',
  CAD: 'C$',
};

export function formatPrice(price: number, currency?: string): string {
  const code = currency?.toUpperCase() ?? 'CNY';
  const symbol = CURRENCY_SYMBOLS[code] ?? code + ' ';
  return `${symbol}${price}`;
}
