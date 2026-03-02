import { useState } from 'react';
import type { MealPlan, MealPlanItem } from '../../../shared/types';
import { formatPrice } from '../utils/formatPrice';

// ─── Props ─────────────────────────────────────

export interface MealPlanCardProps {
  mealPlan: MealPlan;
  isActive: boolean;
  isZh: boolean;
  isReplacing?: boolean;
  replacingDishId?: string | null;
  onAddAllToOrder: (mealPlan: MealPlan) => void;
  onReplaceDish: (dishId: string, dishName: string) => void;
}

// ─── Dish Row ──────────────────────────────────

function DishRow({
  item,
  isActive,
  isZh,
  isReplacing,
  replacingDishId,
  currency,
  onReplaceDish,
}: {
  item: MealPlanItem;
  isActive: boolean;
  isZh: boolean;
  isReplacing?: boolean;
  replacingDishId?: string | null;
  currency?: string;
  onReplaceDish: (dishId: string, dishName: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="py-1.5">
      <div
        className="flex items-center gap-1 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="text-xs text-[var(--color-sage-text-secondary)]">•</span>
        <span className="flex-1 min-w-0 text-sm text-[var(--color-sage-text)] truncate">
          {item.name}
          {item.quantity > 1 && <span className="text-xs text-[var(--color-sage-text-secondary)]"> ×{item.quantity}</span>}
        </span>
        {item.price != null && (
          <span className="text-sm font-medium text-[var(--color-sage-text)] shrink-0">
            {formatPrice(item.price, currency)}
          </span>
        )}
        {replacingDishId === item.dishId ? (
          <span className="shrink-0 w-7 h-7 flex items-center justify-center text-sm animate-spin">⏳</span>
        ) : (
          <button
            disabled={!isActive || isReplacing}
            onClick={(e) => {
              e.stopPropagation();
              onReplaceDish(item.dishId, item.name);
            }}
            className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-sm
              hover:bg-indigo-50 active:bg-indigo-100 disabled:opacity-40 disabled:cursor-not-allowed
              transition-colors"
            aria-label={isZh ? '替换菜品' : 'Replace dish'}
          >
            🔄
          </button>
        )}
      </div>

      {/* Expandable detail */}
      <div
        className="overflow-hidden transition-all duration-200 ease-in-out"
        style={{ maxHeight: expanded ? '120px' : '0px', opacity: expanded ? 1 : 0 }}
      >
        <div className="pl-4 pt-1 space-y-0.5">
          {item.nameOriginal && (
            <p className="text-xs text-[var(--color-sage-text-secondary)]">{item.nameOriginal}</p>
          )}
          {item.reason && (
            <p className="text-xs text-[var(--color-sage-text-secondary)] italic">{item.reason}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────

export function MealPlanCard({
  mealPlan,
  isActive,
  isZh,
  isReplacing = false,
  replacingDishId = null,
  onAddAllToOrder,
  onReplaceDish,
}: MealPlanCardProps) {
  const title = isZh
    ? `🍽 用餐方案 v${mealPlan.version}${!isActive ? '（已替换）' : ''}`
    : `🍽 Meal Plan v${mealPlan.version}${!isActive ? ' (Replaced)' : ''}`;

  return (
    <div
      className={`bg-[var(--color-sage-card)] rounded-[var(--radius-md)] shadow-[var(--shadow-sage)]
        border border-[var(--color-sage-border)] overflow-hidden transition-opacity
        ${!isActive ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--color-sage-border)]">
        <h3 className="text-sm font-bold text-[var(--color-sage-text)]">{title}</h3>
        <button
          disabled={!isActive}
          onClick={() => onAddAllToOrder(mealPlan)}
          className="shrink-0 px-3 py-1 text-xs font-semibold text-white bg-indigo-500
            rounded-full hover:bg-indigo-600 active:bg-indigo-700
            disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isZh ? '整套加入订单' : 'Add All to Order'}
        </button>
      </div>

      {/* Rationale */}
      {mealPlan.rationale && (
        <div className="px-3 py-2 border-b border-[var(--color-sage-border)] bg-indigo-50/40">
          <p className="text-xs text-[var(--color-sage-text-secondary)]">
            📝 {mealPlan.rationale}
          </p>
        </div>
      )}

      {/* Courses */}
      <div className="px-3 py-1">
        {mealPlan.courses.map((course, ci) => (
          <div key={ci}>
            <div className="flex items-center gap-2 py-1.5">
              <div className="flex-1 h-px bg-[var(--color-sage-border)]" />
              <span className="text-xs font-semibold text-[var(--color-sage-text-secondary)] shrink-0">
                {course.name}
              </span>
              <div className="flex-1 h-px bg-[var(--color-sage-border)]" />
            </div>
            {course.items.map((item) => (
              <DishRow
                key={item.dishId}
                item={item}
                isActive={isActive}
                isZh={isZh}
                isReplacing={isReplacing}
                replacingDishId={replacingDishId}
                currency={mealPlan.currency}
                onReplaceDish={onReplaceDish}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-sage-border)] bg-gray-50/60">
        <span className="text-xs font-semibold text-[var(--color-sage-text)]">
          {isZh ? '预估合计' : 'Est. Total'}: {formatPrice(mealPlan.totalEstimate, mealPlan.currency)}
        </span>
        <span className="text-xs text-[var(--color-sage-text-secondary)]">
          {mealPlan.diners}{isZh ? '人' : ' diners'}
        </span>
      </div>
    </div>
  );
}
