import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelectedDishesCard } from '../SelectedDishesCard';
import type { SelectedDishesPayload } from '../../../../shared/types';

function makePayload(overrides: Partial<SelectedDishesPayload> = {}): SelectedDishesPayload {
  return {
    newlySelected: [
      { dishId: 'd1', name: 'Pad Thai', nameOriginal: 'ผัดไทย', price: 120, category: 'Main' },
      { dishId: 'd2', name: 'Tom Yum', nameOriginal: 'ต้มยำ', price: 150, category: 'Soup' },
    ],
    existingOrder: [],
    ...overrides,
  };
}

describe('SelectedDishesCard', () => {
  it('renders newly selected dishes', () => {
    render(<SelectedDishesCard payload={makePayload()} isZh={false} currency="THB" />);
    expect(screen.getByText('Pad Thai')).toBeInTheDocument();
    expect(screen.getByText('Tom Yum')).toBeInTheDocument();
  });

  it('existingOrder not empty → shows "Already in order" section', () => {
    const payload = makePayload({
      existingOrder: [{ dishId: 'd3', name: 'Green Curry', nameOriginal: 'GC', price: 200, category: 'Main' }],
    });
    render(<SelectedDishesCard payload={payload} isZh={false} currency="THB" />);
    expect(screen.getByText(/Already in order/)).toBeInTheDocument();
    expect(screen.getByText('Green Curry')).toBeInTheDocument();
  });

  it('existingOrder empty → no "Already in order" section', () => {
    render(<SelectedDishesCard payload={makePayload()} isZh={false} />);
    expect(screen.queryByText(/Already in order/)).not.toBeInTheDocument();
  });

  it('currency internationalization: THB shows ฿', () => {
    render(<SelectedDishesCard payload={makePayload()} isZh={false} currency="THB" />);
    expect(screen.getByText('฿120')).toBeInTheDocument();
  });

  it('null price → shows no price (formatPrice not called with null)', () => {
    const payload = makePayload({
      newlySelected: [{ dishId: 'd1', name: 'Mystery Dish', nameOriginal: 'M', price: null, category: 'X' }],
    });
    render(<SelectedDishesCard payload={payload} isZh={false} />);
    expect(screen.getByText('Mystery Dish')).toBeInTheDocument();
  });

  // Bug-2 additions: category grouping + total price

  it('groups newlySelected by category when multiple categories exist', () => {
    render(<SelectedDishesCard payload={makePayload()} isZh={false} currency="THB" />);
    // Two different categories: Main and Soup → should show category headers
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Soup')).toBeInTheDocument();
  });

  it('shows estimated total price', () => {
    render(<SelectedDishesCard payload={makePayload()} isZh={false} currency="THB" />);
    const total = screen.getByTestId('estimated-total');
    expect(total).toBeInTheDocument();
    expect(total.textContent).toContain('270'); // 120 + 150
  });

  it('partial null prices → shows total with unknown note', () => {
    const payload = makePayload({
      newlySelected: [
        { dishId: 'd1', name: 'A', nameOriginal: 'A', price: 100, category: 'Main' },
        { dishId: 'd2', name: 'B', nameOriginal: 'B', price: null, category: 'Main' },
      ],
    });
    render(<SelectedDishesCard payload={payload} isZh={false} currency="THB" />);
    const total = screen.getByTestId('estimated-total');
    expect(total.textContent).toContain('100');
    expect(total.textContent).toContain('some prices unknown');
  });

  it('all null prices → no total shown', () => {
    const payload = makePayload({
      newlySelected: [
        { dishId: 'd1', name: 'A', nameOriginal: 'A', price: null, category: 'X' },
      ],
    });
    render(<SelectedDishesCard payload={payload} isZh={false} />);
    expect(screen.queryByTestId('estimated-total')).not.toBeInTheDocument();
  });

  it('F07-AC7: empty newlySelected renders no dish items (boundary: consult AI with nothing)', () => {
    const payload = makePayload({ newlySelected: [], existingOrder: [] });
    render(<SelectedDishesCard payload={payload} isZh={false} />);
    // Card still renders header but no dishes
    expect(screen.getByText(/Selected Dishes/)).toBeInTheDocument();
    expect(screen.queryByText('Pad Thai')).not.toBeInTheDocument();
  });

  it('single category → no category headers shown', () => {
    const payload = makePayload({
      newlySelected: [
        { dishId: 'd1', name: 'A', nameOriginal: 'A', price: 50, category: 'Main' },
        { dishId: 'd2', name: 'B', nameOriginal: 'B', price: 60, category: 'Main' },
      ],
    });
    render(<SelectedDishesCard payload={payload} isZh={false} currency="THB" />);
    // Only one category → no category header rendered (grouped.size <= 1)
    const mainHeaders = screen.queryAllByText('Main');
    expect(mainHeaders.length).toBe(0);
  });
});
