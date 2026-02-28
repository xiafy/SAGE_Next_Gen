import { useState } from 'react';
import { Card3D } from './Card3D';
import { Button3D } from './Button3D';
import type { MenuItem, AllergenType, DietaryFlag } from '../../../shared/types';
import type { OrderItem } from '../types';

// ─── Label Maps ────────────────────────────────

const ALLERGEN_LABELS: Record<AllergenType, { zh: string; en: string }> = {
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

const DIETARY_LABELS: Record<DietaryFlag, { zh: string; en: string }> = {
  halal: { zh: '清真', en: 'Halal' },
  vegetarian: { zh: '素食', en: 'Vegetarian' },
  vegan: { zh: '纯素', en: 'Vegan' },
  raw: { zh: '生食', en: 'Raw' },
  contains_alcohol: { zh: '含酒精', en: 'Alcohol' },
};

const GREEN_DIETARY: DietaryFlag[] = ['vegetarian', 'vegan', 'halal'];

// ─── Props ─────────────────────────────────────

export interface DishCardProps {
  item: MenuItem;
  isZh: boolean;
  userAllergens: string[];
  orderItem?: OrderItem;
  onAdd: () => void;
  onUpdateQty: (qty: number) => void;
}

// ─── Component ─────────────────────────────────

export function DishCard({ item, isZh, userAllergens, orderItem, onAdd, onUpdateQty }: DishCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Safe access for new fields (backward compat with cached old data)
  const allergens = item.allergens ?? [];
  const dietaryFlags = item.dietaryFlags ?? [];
  const spiceLevel = item.spiceLevel ?? 0;
  const calories = item.calories ?? null;

  // Allergen matching
  const matchedAllergens = allergens
    .filter((a) => userAllergens.includes(a.type))
    .map((a) => a.type);
  const hasAllergenWarning = matchedAllergens.length > 0;

  const warningText = hasAllergenWarning
    ? (isZh ? '⚠️ 可能含有您标记的过敏原：' : '⚠️ May contain allergens you flagged: ') +
      matchedAllergens.map((t) => isZh ? ALLERGEN_LABELS[t].zh : ALLERGEN_LABELS[t].en).join('、')
    : '';

  return (
    <Card3D className="!p-3">
      {/* Allergen warning bar */}
      {hasAllergenWarning && (
        <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-3 py-1.5 text-xs mb-2 font-medium">
          {warningText}
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="text-sm font-bold text-[var(--color-sage-text)]">
            {item.nameTranslated}
          </p>
          <p className="text-xs text-[var(--color-sage-text-secondary)]">{item.nameOriginal}</p>

          {/* F11: Brief */}
          {item.brief && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{item.brief}</p>
          )}

          {/* F11: BriefDetail expand toggle */}
          {item.briefDetail && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[10px] text-[var(--color-sage-primary)] mt-0.5 flex items-center gap-0.5 hover:underline"
              >
                <span
                  className="inline-block transition-transform duration-200"
                  style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                >
                  ▶
                </span>
                {isZh ? (expanded ? '收起' : '详情') : (expanded ? 'Less' : 'Details')}
              </button>
              <div
                className="overflow-hidden transition-all duration-200 ease-in-out"
                style={{
                  maxHeight: expanded ? '200px' : '0px',
                  opacity: expanded ? 1 : 0,
                }}
              >
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.briefDetail}</p>
              </div>
            </>
          )}

          {/* F12: Dietary tags row */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {/* Allergen pills */}
            {allergens.map((a) => {
              const isMatched = matchedAllergens.includes(a.type);
              const label = isZh ? ALLERGEN_LABELS[a.type].zh : ALLERGEN_LABELS[a.type].en;
              const prefix = a.uncertain ? '⚠️ ' : '';
              return (
                <span
                  key={`a-${a.type}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isMatched
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {isMatched ? '⚠️ ' : prefix}{label}
                </span>
              );
            })}

            {/* Dietary flag pills */}
            {dietaryFlags.map((flag) => {
              const label = isZh ? DIETARY_LABELS[flag].zh : DIETARY_LABELS[flag].en;
              const isGreen = GREEN_DIETARY.includes(flag);
              return (
                <span
                  key={`d-${flag}`}
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isGreen
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {label}
                </span>
              );
            })}

            {/* Spice level */}
            {spiceLevel > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-600 font-medium">
                {'🌶'.repeat(spiceLevel)}
              </span>
            )}

            {/* Calories */}
            {calories != null && calories > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                ~{calories} kcal
              </span>
            )}
          </div>
        </div>

        {/* Right side: price + order controls */}
        <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
          {item.priceText && (
            <span className="text-sm font-bold text-[var(--color-sage-primary)]">
              {item.priceText}
            </span>
          )}
          {orderItem ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateQty(orderItem.quantity - 1)}
                className="w-7 h-7 rounded-full border-2 border-[var(--color-sage-border)] flex items-center justify-center text-[var(--color-sage-text-secondary)] hover:border-[var(--color-sage-primary)] hover:text-[var(--color-sage-primary)] transition-colors text-sm"
              >−</button>
              <span className="text-sm font-bold w-4 text-center">{orderItem.quantity}</span>
              <button
                onClick={() => onUpdateQty(orderItem.quantity + 1)}
                className="w-7 h-7 rounded-full bg-[var(--color-sage-primary)] hover:bg-[var(--color-sage-primary-dark)] text-white flex items-center justify-center transition-colors text-sm"
              >+</button>
            </div>
          ) : (
            <Button3D
              size="sm"
              onClick={onAdd}
            >
              {isZh ? '加入' : 'Add'}
            </Button3D>
          )}
        </div>
      </div>
    </Card3D>
  );
}
