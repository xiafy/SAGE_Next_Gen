import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MealPlanCard } from '../MealPlanCard';
import type { MealPlan } from '../../../../shared/types';

function makeMealPlan(overrides: Partial<MealPlan> = {}): MealPlan {
  return {
    version: 1,
    totalEstimate: 500,
    currency: 'THB',
    rationale: 'Good balance',
    diners: 2,
    courses: [
      {
        name: 'Appetizer',
        items: [
          { dishId: 'd1', name: 'Spring Rolls', nameOriginal: 'ปอเปี๊ยะทอด', price: 80, reason: 'Light start', quantity: 1 },
        ],
      },
      {
        name: 'Main',
        items: [
          { dishId: 'd2', name: 'Pad Thai', nameOriginal: 'ผัดไทย', price: 120, reason: 'Classic', quantity: 1 },
          { dishId: 'd3', name: 'Tom Yum', nameOriginal: 'ต้มยำ', price: 150, reason: 'Spicy', quantity: 2 },
        ],
      },
    ],
    ...overrides,
  };
}

const defaultProps = {
  isActive: true,
  isZh: false,
  onAddAllToOrder: vi.fn(),
  onReplaceDish: vi.fn(),
};

describe('MealPlanCard', () => {
  it('renders course names, dish names, and prices', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} />);
    expect(screen.getByText('Appetizer')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('Spring Rolls')).toBeInTheDocument();
    expect(screen.getByText('฿80')).toBeInTheDocument();
  });

  it('renders multiple courses correctly grouped', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} />);
    expect(screen.getByText('Appetizer')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('renders single-item course', () => {
    const mp = makeMealPlan({ courses: [{ name: 'Solo', items: [{ dishId: 'd1', name: 'Dish', nameOriginal: 'D', price: 50, reason: '', quantity: 1 }] }] });
    render(<MealPlanCard mealPlan={mp} {...defaultProps} />);
    expect(screen.getByText('Dish')).toBeInTheDocument();
  });

  it('expand/collapse: click dish row → shows nameOriginal and reason', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} />);
    // Click on the Spring Rolls row
    fireEvent.click(screen.getByText('Spring Rolls'));
    // nameOriginal and reason should now be visible
    expect(screen.getByText('ปอเปี๊ยะทอด')).toBeInTheDocument();
    expect(screen.getByText('Light start')).toBeInTheDocument();
  });

  it('inactive: opacity reduced + buttons disabled + shows (Replaced)', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} isActive={false} />);
    expect(screen.getByText(/Replaced/)).toBeInTheDocument();
    const addAllBtn = screen.getByText('Add All to Order');
    expect(addAllBtn).toBeDisabled();
  });

  it('replacing state: replace buttons disabled', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} isReplacing={true} />);
    const replaceButtons = screen.getAllByLabelText('Replace dish');
    replaceButtons.forEach(btn => expect(btn).toBeDisabled());
  });

  it('replacingDishId → shows spinner on that dish', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} isReplacing={true} replacingDishId="d1" />);
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('click Add All to Order → calls onAddAllToOrder', () => {
    const onAddAll = vi.fn();
    const mp = makeMealPlan();
    render(<MealPlanCard mealPlan={mp} {...defaultProps} onAddAllToOrder={onAddAll} />);
    fireEvent.click(screen.getByText('Add All to Order'));
    expect(onAddAll).toHaveBeenCalledWith(mp);
  });

  it('click replace button → calls onReplaceDish', () => {
    const onReplace = vi.fn();
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} onReplaceDish={onReplace} />);
    const replaceButtons = screen.getAllByLabelText('Replace dish');
    fireEvent.click(replaceButtons[0]!);
    expect(onReplace).toHaveBeenCalledWith('d1', 'Spring Rolls');
  });

  it('empty courses → no crash', () => {
    const mp = makeMealPlan({ courses: [] });
    render(<MealPlanCard mealPlan={mp} {...defaultProps} />);
    // Should render header at least
    expect(screen.getByText(/Meal Plan/)).toBeInTheDocument();
  });
});

describe('MealPlanCard — concurrent/replacing states', () => {
  it('two cards: inactive buttons disabled, active buttons enabled', () => {
    const mp = makeMealPlan();
    render(
      <div>
        <MealPlanCard mealPlan={mp} isActive={false} isZh={false} onAddAllToOrder={vi.fn()} onReplaceDish={vi.fn()} />
        <MealPlanCard mealPlan={makeMealPlan({ version: 2 })} isActive={true} isZh={false} onAddAllToOrder={vi.fn()} onReplaceDish={vi.fn()} />
      </div>
    );
    const addBtns = screen.getAllByText('Add All to Order');
    expect(addBtns[0]).toBeDisabled();
    expect(addBtns[1]).not.toBeDisabled();
  });

  it('isReplacing + replacingDishId matches: target shows spinner, others disabled without spinner', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} isReplacing={true} replacingDishId="d2" />);
    // d2 should show spinner
    expect(screen.getByText('⏳')).toBeInTheDocument();
    // Other replace buttons should be disabled
    const replaceButtons = screen.getAllByLabelText('Replace dish');
    replaceButtons.forEach(btn => expect(btn).toBeDisabled());
    // Only one spinner
    expect(screen.getAllByText('⏳')).toHaveLength(1);
  });

  it('isReplacing + replacingDishId matches no dish: all replace disabled, no spinner', () => {
    render(<MealPlanCard mealPlan={makeMealPlan()} {...defaultProps} isReplacing={true} replacingDishId="nonexistent" />);
    expect(screen.queryByText('⏳')).not.toBeInTheDocument();
    const replaceButtons = screen.getAllByLabelText('Replace dish');
    replaceButtons.forEach(btn => expect(btn).toBeDisabled());
  });
});

describe('F06-AC8: MealPlanCard for meal plan display', () => {
  it('F06-AC8: renders dynamic course structure (not hardcoded Western order)', () => {
    const mp = makeMealPlan({
      courses: [
        { name: '前菜', items: [{ dishId: 'd1', name: 'Edamame', nameOriginal: '枝豆', price: 300, reason: 'Light', quantity: 1 }] },
        { name: '刺身', items: [{ dishId: 'd2', name: 'Sashimi', nameOriginal: '刺身盛り', price: 1200, reason: 'Fresh', quantity: 1 }] },
        { name: '焼物', items: [{ dishId: 'd3', name: 'Yakitori', nameOriginal: '焼き鳥', price: 500, reason: 'Classic', quantity: 2 }] },
      ],
    });
    render(<MealPlanCard mealPlan={mp} {...defaultProps} />);
    expect(screen.getByText('前菜')).toBeInTheDocument();
    expect(screen.getByText('刺身')).toBeInTheDocument();
    expect(screen.getByText('焼物')).toBeInTheDocument();
  });

  it('F06-AC8: Add All to Order button includes all courses', () => {
    const onAddAll = vi.fn();
    const mp = makeMealPlan();
    render(<MealPlanCard mealPlan={mp} {...defaultProps} onAddAllToOrder={onAddAll} />);
    fireEvent.click(screen.getByText('Add All to Order'));
    expect(onAddAll).toHaveBeenCalledWith(mp);
    // Verify the meal plan passed has all courses
    const passedPlan = onAddAll.mock.calls[0]![0] as MealPlan;
    expect(passedPlan.courses).toHaveLength(2);
    const allItems = passedPlan.courses.flatMap(c => c.items);
    expect(allItems).toHaveLength(3);
  });
});
