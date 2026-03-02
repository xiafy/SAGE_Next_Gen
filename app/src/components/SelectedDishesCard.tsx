import type { SelectedDishesPayload } from '../../../shared/types';

// ─── Props ─────────────────────────────────────

export interface SelectedDishesCardProps {
  payload: SelectedDishesPayload;
  isZh: boolean;
}

// ─── Component ─────────────────────────────────

export function SelectedDishesCard({ payload, isZh }: SelectedDishesCardProps) {
  const { newlySelected, existingOrder } = payload;

  return (
    <div className="mx-auto max-w-sm bg-gray-100 rounded-[var(--radius-md)] px-4 py-3 text-sm text-gray-600">
      <p className="font-semibold text-gray-700 mb-2">📋 {isZh ? '已选菜品' : 'Selected Dishes'}</p>

      {/* Newly selected */}
      <p className="text-xs text-gray-500 mb-1">
        {isZh
          ? `新选了 ${newlySelected.length} 道菜：`
          : `${newlySelected.length} newly selected:`}
      </p>
      <ul className="space-y-0.5 mb-2">
        {newlySelected.map((d) => (
          <li key={d.dishId} className="flex items-center gap-1 text-xs">
            <span className="text-gray-400">•</span>
            <span className="flex-1 truncate">{d.name}</span>
            {d.price != null && (
              <span className="shrink-0 font-medium">¥{d.price}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Existing order */}
      {existingOrder.length > 0 && (
        <>
          <p className="text-xs text-gray-500 mb-1">
            {isZh
              ? `已在订单中（${existingOrder.length} 道）：`
              : `Already in order (${existingOrder.length}):`}
          </p>
          <ul className="space-y-0.5">
            {existingOrder.map((d) => (
              <li key={d.dishId} className="flex items-center gap-1 text-xs text-gray-400">
                <span>•</span>
                <span className="flex-1 truncate">{d.name}</span>
                {d.price != null && (
                  <span className="shrink-0">¥{d.price}</span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
