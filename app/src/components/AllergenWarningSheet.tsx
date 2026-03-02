import type { MenuItem } from '../../../shared/types';

interface AllergenInfo {
  type: string;
  uncertain: boolean;
}

interface RiskItem {
  menuItem: MenuItem;
  allergens: AllergenInfo[];
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
      {/* 🟡-3: Backdrop — no onClick (prevent accidental dismiss in allergy safety context) */}
      <div className="absolute inset-0 bg-black/60" />

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
                {ri.allergens.map((a) => ALLERGEN_ICONS[a.type] ?? '⚠️').join('')}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 text-base">
                  {isZh ? ri.menuItem.nameTranslated : ri.menuItem.nameOriginal}
                </p>
                {/* 🔴-2: Show uncertain vs definite allergen labels */}
                <div className="flex flex-col gap-0.5">
                  {ri.allergens.map((a) => {
                    const l = ALLERGEN_LABELS[a.type];
                    const name = l ? (isZh ? l.zh : l.en) : a.type;
                    if (a.uncertain) {
                      return (
                        <p key={a.type} className="text-sm text-yellow-700">
                          ⚠️ {isZh ? `可能含有 ${name}` : `May contain ${name}`}
                        </p>
                      );
                    }
                    return (
                      <p key={a.type} className="text-sm text-red-700">
                        ❌ {isZh ? `含有 ${name}` : `Contains ${name}`}
                      </p>
                    );
                  })}
                </div>
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
          {/* 🟡-2: Updated button text */}
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-orange-500 text-white font-bold text-base hover:bg-orange-600 transition-colors"
          >
            {isZh ? '确认并继续' : 'Confirm and Continue'}
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center mt-3">
          {isZh ? '过敏原信息仅供参考，请向餐厅确认' : 'Allergen info is for reference only. Please confirm with the restaurant.'}
        </p>
      </div>
    </div>
  );
}
