import type { SelectedDishesPayload, SelectedDishSummary } from '../../../shared/types';
import { formatPrice } from '../utils/formatPrice';

// ─── Props ─────────────────────────────────────

export interface SelectedDishesCardProps {
  payload: SelectedDishesPayload;
  isZh: boolean;
  currency?: string;
}

// ─── Helpers ───────────────────────────────────

function groupByCategory(dishes: SelectedDishSummary[]): Map<string, SelectedDishSummary[]> {
  const map = new Map<string, SelectedDishSummary[]>();
  for (const d of dishes) {
    const cat = d.category || 'Other';
    const list = map.get(cat);
    if (list) list.push(d);
    else map.set(cat, [d]);
  }
  return map;
}

function DishList({ dishes, currency, dim }: { dishes: SelectedDishSummary[]; currency?: string; dim?: boolean }) {
  return (
    <ul className="space-y-0.5">
      {dishes.map((d) => (
        <li key={d.dishId} className={`flex items-center gap-1 text-xs ${dim ? 'text-gray-400' : ''}`}>
          <span className={dim ? '' : 'text-gray-400'}>•</span>
          <span className="flex-1 truncate">{d.name}</span>
          {d.price != null && (
            <span className="shrink-0 font-medium">{formatPrice(d.price, currency)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── Component ─────────────────────────────────

export function SelectedDishesCard({ payload, isZh, currency }: SelectedDishesCardProps) {
  const { newlySelected, existingOrder } = payload;
  const grouped = groupByCategory(newlySelected);

  // Compute total price
  const allNewPrices = newlySelected.map(d => d.price);
  const knownPrices = allNewPrices.filter((p): p is number => p != null);
  const totalPrice = knownPrices.reduce((sum, p) => sum + p, 0);
  const hasUnknownPrice = allNewPrices.some(p => p == null);

  return (
    <div className="mx-auto max-w-sm bg-gray-100 rounded-[var(--radius-md)] px-4 py-3 text-sm text-gray-600">
      <p className="font-semibold text-gray-700 mb-2">📋 {isZh ? '已选菜品' : 'Selected Dishes'}</p>

      {/* Newly selected — grouped by category */}
      <p className="text-xs text-gray-500 mb-1">
        {isZh
          ? `新选了 ${newlySelected.length} 道菜：`
          : `${newlySelected.length} newly selected:`}
      </p>
      {grouped.size > 1 ? (
        <div className="space-y-1.5 mb-2">
          {Array.from(grouped.entries()).map(([cat, dishes]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-gray-500">{cat}</p>
              <DishList dishes={dishes} currency={currency} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-2">
          <DishList dishes={newlySelected} currency={currency} />
        </div>
      )}

      {/* Estimated total */}
      {knownPrices.length > 0 && (
        <p className="text-xs text-gray-500 mb-2" data-testid="estimated-total">
          {isZh ? '预估总价：' : 'Est. Total: '}
          <span className="font-medium">{formatPrice(totalPrice, currency)}</span>
          {hasUnknownPrice && (
            <span className="text-gray-400">{isZh ? '（部分菜品价格未知）' : ' (some prices unknown)'}</span>
          )}
        </p>
      )}

      {/* Existing order */}
      {existingOrder.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-1">
            {isZh
              ? `已在订单中（${existingOrder.length} 道）：`
              : `Already in order (${existingOrder.length}):`}
          </p>
          <DishList dishes={existingOrder} currency={currency} dim />
        </>
      )}
    </div>
  );
}
