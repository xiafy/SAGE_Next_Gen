import type { AllergenType } from '../../../shared/types';

/**
 * Map user dietary preferences to AllergenType values for DishCard matching.
 *
 * Handles BOTH formats:
 * 1. Legacy Settings tags: "contains_nuts" → ['peanut', 'tree_nut']
 * 2. Direct allergen names from AI preferenceUpdates: "peanut" → ['peanut']
 */

const VALID_ALLERGEN_SET = new Set<string>([
  'peanut', 'shellfish', 'fish', 'gluten', 'dairy',
  'egg', 'soy', 'tree_nut', 'sesame',
]);

const LEGACY_MAP: Record<string, AllergenType[]> = {
  contains_nuts: ['peanut', 'tree_nut'],
  contains_seafood: ['shellfish', 'fish'],
  gluten_free: ['gluten'],
  // Additional mappings for common AI-generated values
  nut_allergy: ['peanut', 'tree_nut'],
  seafood_allergy: ['shellfish', 'fish'],
  dairy_free: ['dairy'],
  egg_free: ['egg'],
};

export function mapDietaryToAllergens(dietary: string[]): string[] {
  const result = new Set<string>();

  for (const d of dietary) {
    // 1. Check legacy map
    const mapped = LEGACY_MAP[d];
    if (mapped) {
      for (const a of mapped) result.add(a);
      continue;
    }
    // 2. Check if it's a direct allergen name
    if (VALID_ALLERGEN_SET.has(d)) {
      result.add(d);
      continue;
    }
    // 3. Fuzzy match common patterns
    const lower = d.toLowerCase().replace(/[_\s-]/g, '');
    if (lower.includes('peanut')) result.add('peanut');
    if (lower.includes('shellfish') || lower.includes('shrimp') || lower.includes('crab')) result.add('shellfish');
    if (lower.includes('fish') && !lower.includes('shellfish')) result.add('fish');
    if (lower.includes('gluten')) result.add('gluten');
    if (lower.includes('dairy') || lower.includes('milk') || lower.includes('lactose')) result.add('dairy');
    if (lower.includes('egg')) result.add('egg');
    if (lower.includes('soy')) result.add('soy');
    if (lower.includes('nut') && !lower.includes('peanut')) result.add('tree_nut');
    if (lower.includes('sesame')) result.add('sesame');
  }

  return Array.from(result);
}
