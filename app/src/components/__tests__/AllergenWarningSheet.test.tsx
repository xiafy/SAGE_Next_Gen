import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AllergenWarningSheet } from '../AllergenWarningSheet';
import type { MenuItem } from '../../../../shared/types';

function makeMenuItem(id: string): MenuItem {
  return {
    id,
    nameOriginal: `Dish ${id}`,
    nameTranslated: `菜品 ${id}`,
    tags: [],
    brief: '',
    allergens: [],
    dietaryFlags: [],
    spiceLevel: 0,
    calories: null,
  };
}

const defaultProps = {
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  isZh: false,
};

describe('F08-AC9: AllergenWarningSheet — allergen warning before waiter mode', () => {
  it('renders risk items with allergen info', () => {
    render(
      <AllergenWarningSheet
        riskItems={[{ menuItem: makeMenuItem('d1'), allergens: [{ type: 'peanut', uncertain: false }] }]}
        {...defaultProps}
      />,
    );
    expect(screen.getByText('Dish d1')).toBeInTheDocument();
    expect(screen.getByText(/Contains Peanut/)).toBeInTheDocument();
  });

  it('uncertain=true → shows "May contain"', () => {
    render(
      <AllergenWarningSheet
        riskItems={[{ menuItem: makeMenuItem('d1'), allergens: [{ type: 'dairy', uncertain: true }] }]}
        {...defaultProps}
      />,
    );
    expect(screen.getByText(/May contain Dairy/)).toBeInTheDocument();
  });

  it('uncertain=false → shows "Contains"', () => {
    render(
      <AllergenWarningSheet
        riskItems={[{ menuItem: makeMenuItem('d1'), allergens: [{ type: 'gluten', uncertain: false }] }]}
        {...defaultProps}
      />,
    );
    expect(screen.getByText(/Contains Gluten/)).toBeInTheDocument();
  });

  it('click confirm → calls onConfirm', () => {
    const onConfirm = vi.fn();
    render(
      <AllergenWarningSheet
        riskItems={[{ menuItem: makeMenuItem('d1'), allergens: [{ type: 'egg', uncertain: false }] }]}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
        isZh={false}
      />,
    );
    fireEvent.click(screen.getByText('Confirm and Continue'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('click cancel → calls onCancel', () => {
    const onCancel = vi.fn();
    render(
      <AllergenWarningSheet
        riskItems={[{ menuItem: makeMenuItem('d1'), allergens: [{ type: 'egg', uncertain: false }] }]}
        onConfirm={vi.fn()}
        onCancel={onCancel}
        isZh={false}
      />,
    );
    fireEvent.click(screen.getByText('Go Back'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('empty riskItems → returns null (nothing rendered)', () => {
    const { container } = render(
      <AllergenWarningSheet riskItems={[]} {...defaultProps} />,
    );
    expect(container.innerHTML).toBe('');
  });
});
