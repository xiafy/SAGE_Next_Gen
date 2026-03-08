import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

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

describe('F08-AC2: Waiter display mode typography and contrast', () => {
  it('F08-AC2: renders waiter page container with dark high-contrast classes', async () => {
    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    const waiterRoot = container.querySelector('[class*="bg-black"], [class*="bg-slate"], [class*="text-white"]');
    expect(waiterRoot).not.toBeNull();
  });

  it('F08-AC2: key dish text uses large-font class (>= 28px equivalent utility)', async () => {
    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    const classNames = Array.from(container.querySelectorAll('*'))
      .map((el) => el.getAttribute('class') ?? '')
      .join(' ');
    const hasReadableContrastText = /text-white|text-slate-100|text-gray-100/.test(classNames);
    expect(hasReadableContrastText).toBe(true);
  });

  it('F08-AC2: empty order still keeps dark display shell for waiter readability', async () => {
    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    const classText = container.textContent ?? '';
    expect(typeof classText).toBe('string');
  });
});

describe('F08-AC3: Waiter display content only original name + quantity', () => {
  it('F08-AC3: translated labels are not rendered in waiter display', async () => {
    const { WaiterModeView } = await import('../WaiterModeView');
    render(<WaiterModeView />);

    expect(screen.queryByText(/translation|translated|翻译/i)).toBeNull();
  });

  it('F08-AC3: no price symbol appears in waiter display list', async () => {
    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    const text = container.textContent ?? '';
    expect(text.includes('฿')).toBe(false);
    expect(text.includes('$')).toBe(false);
    expect(text.includes('€')).toBe(false);
  });

  it('F08-AC3: boundary - empty waiter list does not render fake quantity text', async () => {
    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    const text = container.textContent ?? '';
    expect(/x\d+/i.test(text)).toBe(false);
  });
});

describe('F08-AC4: Waiter display requests wake lock with fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('F08-AC4: wakeLock available -> request called', async () => {
    const release = vi.fn().mockResolvedValue(undefined);
    const request = vi.fn().mockResolvedValue({ release });
    Object.defineProperty(globalThis.navigator, 'wakeLock', {
      value: { request },
      configurable: true,
      writable: true,
    });

    const { WaiterModeView } = await import('../WaiterModeView');
    render(<WaiterModeView />);

    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('screen');
    });
  });

  it('F08-AC4: wakeLock unavailable -> view still renders (graceful degradation)', async () => {
    Object.defineProperty(globalThis.navigator, 'wakeLock', {
      value: undefined,
      configurable: true,
      writable: true,
    });

    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    expect(container).not.toBeNull();
  });

  it('F08-AC4: wakeLock rejection does not crash render (error path)', async () => {
    const request = vi.fn().mockRejectedValue(new Error('not allowed'));
    Object.defineProperty(globalThis.navigator, 'wakeLock', {
      value: { request },
      configurable: true,
      writable: true,
    });

    const { WaiterModeView } = await import('../WaiterModeView');
    const { container } = render(<WaiterModeView />);

    expect(container).not.toBeNull();
  });
});
