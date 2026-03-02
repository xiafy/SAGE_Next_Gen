import type { MenuItem } from '../../../shared/types';

interface RiskItem {
  menuItem: MenuItem;
  allergens: string[];
}

interface AllergenWarningSheetProps {
  riskItems: RiskItem[];
  onConfirm: () => void;
  onCancel: () => void;
  isZh: boolean;
}

const ALLERGEN_LABELS: Record<string, { zh: string; en: string }> = {
  peanut: { zh: '花生', en: 'Peanut' },
  shellfish: { zh: '甲壳类', en: 'Shellfish' },
  fish: { zh: '鱼类', en: 'Fish' },
  gluten: { zh: '麸质', en: 'Gluten' },
  dairy: { zh: '乳制品', en: 'Dairy' },
  egg: { zh: '蛋', en: 'Egg' },
  soy: { zh: '大豆', en: 'Soy' },
  tree_nut: { zh: '坚果', en: 'Tree Nut' },
  sesame: { zh: '芝麻', en: 'Sesame' },
};

const ALLERGEN_ICONS: Record<string, string> = {
  peanut: '🥜', shellfish: '🦐', fish: '🐟', gluten: '🌾', dairy: '🥛',
  egg: '🥚', soy: '🫘', tree_nut: '🌰', sesame: '⚪',
};

export function AllergenWarningSheet({ riskItems, onConfirm, onCancel, isZh }: AllergenWarningSheetProps) {
  if (riskItems.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />

      {/* Sheet */}
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl px-6 py-6 animate-slide-up">
        <h2 className="text-xl font-bold text-center mb-1">
          {isZh ? '⚠️ 过敏风险提醒' : '⚠️ Allergy Risk Warning'}
        </h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          {isZh
            ? '以下菜品可能含有你的过敏原，建议向服务员确认：'
            : 'These dishes may contain your allergens. Please confirm with staff:'}
        </p>

        <div className="flex flex-col gap-3 max-h-60 overflow-y-auto mb-5">
          {riskItems.map((ri) => (
            <div key={ri.menuItem.id} className="flex items-start gap-3 bg-orange-50 rounded-xl px-4 py-3">
              <span className="text-xl shrink-0">
                {ri.allergens.map((a) => ALLERGEN_ICONS[a] ?? '⚠️').join('')}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-base">
                  {isZh ? ri.menuItem.nameTranslated : ri.menuItem.nameOriginal}
                </p>
                <p className="text-sm text-orange-700">
                  {ri.allergens.map((a) => {
                    const l = ALLERGEN_LABELS[a];
                    return l ? (isZh ? l.zh : l.en) : a;
                  }).join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-700 font-bold text-base hover:bg-gray-50 transition-colors"
          >
            {isZh ? '返回修改' : 'Go Back'}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-base hover:bg-orange-600 transition-colors"
          >
            {isZh ? '我已确认' : 'I Understand'}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          {isZh ? '过敏原信息仅供参考，请向餐厅确认' : 'Allergen info is for reference only. Please confirm with the restaurant.'}
        </p>
      </div>
    </div>
  );
}
