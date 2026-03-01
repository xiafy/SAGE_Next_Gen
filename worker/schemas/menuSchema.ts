import { z } from 'zod';

const VALID_TAGS = [
  'spicy', 'vegetarian', 'vegan', 'gluten_free',
  'contains_nuts', 'contains_seafood', 'contains_pork',
  'contains_alcohol', 'popular', 'signature',
] as const;

const VALID_ALLERGENS = ['peanut', 'shellfish', 'fish', 'gluten', 'dairy', 'egg', 'soy', 'tree_nut', 'sesame'] as const;
const VALID_DIETARY_FLAGS = ['halal', 'vegetarian', 'vegan', 'raw', 'contains_alcohol'] as const;

const MenuItemSchema = z.object({
  id:                   z.string().min(1),
  nameOriginal:         z.string().min(1),
  nameTranslated:       z.string().min(1),
  descriptionTranslated: z.string().optional(),
  price:                z.number().optional(),
  priceText:            z.string().optional(),
  // AI 可能返回不在白名单中的 tag（如 contains_gluten），宽容处理：过滤掉无效值
  tags:                 z.array(z.string()).default([]).transform(
    (arr) => arr.filter((t): t is typeof VALID_TAGS[number] =>
      (VALID_TAGS as readonly string[]).includes(t)
    )
  ),
  // F11: 菜品概要
  brief:                z.string().default(''),
  briefDetail:          z.string().optional(),
  // F12: 饮食标签
  allergens:            z.union([
    // Standard format: [{type, uncertain}]
    z.array(z.object({
      type: z.string(),
      uncertain: z.union([z.boolean(), z.string()]).default(false).transform(
        (v) => v === true || v === 'true'
      ),
    }).passthrough()),
    // AI sometimes returns object format: {peanut: false, shellfish: true, ...}
    // Convert to standard array format
    z.record(z.union([z.boolean(), z.string()])).transform(
      (obj) => Object.entries(obj)
        .filter(([, v]) => v === true || v === 'true')
        .map(([type]) => ({ type, uncertain: false }))
    ),
  ]).default([]).transform(
    (arr) => arr.filter((a) => (VALID_ALLERGENS as readonly string[]).includes(a.type))
  ),
  dietaryFlags:         z.array(z.string()).default([]).transform(
    (arr) => arr.filter((f) => (VALID_DIETARY_FLAGS as readonly string[]).includes(f))
  ),
  spiceLevel:           z.union([z.number(), z.string()]).default(0).transform(
    (v) => { const n = Number(v); return isNaN(n) ? 0 : Math.min(5, Math.max(0, Math.round(n))); }
  ),
  calories:             z.union([z.number(), z.string(), z.null()]).default(null).transform(
    (v) => { if (v === null || v === '' || v === 'null') return null; const n = Number(v); return isNaN(n) ? null : Math.round(n); }
  ),
});

const CategorySchema = z.object({
  id:             z.string().min(1),
  nameOriginal:   z.string().min(1),
  nameTranslated: z.string().min(1),
  itemIds:        z.array(z.string()),
});

export const MenuAnalyzeResultSchema = z.object({
  menuType:         z.enum(['restaurant', 'bar', 'dessert', 'fastfood', 'cafe', 'other']),
  detectedLanguage: z.string().min(2).max(5),
  priceLevel:       z.union([z.literal(1), z.literal(2), z.literal(3)]),
  currency:         z.string().optional(),
  categories:       z.array(CategorySchema),
  items:            z.array(MenuItemSchema),
  processingMs:     z.number().default(0),
  imageCount:       z.number().min(1),
}).refine(
  data => !('agentRole' in data) && !('agentGreeting' in data),
  { message: 'agentRole/agentGreeting must not be present (DEC-020)' },
);

export type MenuAnalyzeResult = z.infer<typeof MenuAnalyzeResultSchema>;
export type MenuItem = z.infer<typeof MenuItemSchema>;
export type MenuCategory = z.infer<typeof CategorySchema>;
