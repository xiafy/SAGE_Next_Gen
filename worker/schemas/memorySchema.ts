import { z } from 'zod';

const MessageSchema = z.object({
  role: z.string(),
  content: z.string(),
});

const RestrictionSchema = z.object({
  type: z.enum(['allergy', 'diet', 'dislike']),
  value: z.string(),
});

const FlavorPreferenceSchema = z.object({
  type: z.enum(['like', 'dislike']),
  value: z.string(),
  strength: z.number().min(1).max(3),
});

const PreferenceEntrySchema = z.object({
  value: z.string(),
  source: z.enum(['explicit', 'inferred']),
  confidence: z.number().min(0).max(1),
  firstSeen: z.string(),
  lastSeen: z.string(),
  occurrences: z.number().int().min(0),
});

const DiningHistorySchema = z.object({
  restaurantType: z.string(),
  orderedItems: z.array(z.string()),
  timestamp: z.number(),
  location: z.string().optional(),
});

const UserPreferencesSchema = z.object({
  restrictions: z.array(RestrictionSchema).default([]),
  allergies: z.array(z.string()).default([]),
  flavors: z.array(FlavorPreferenceSchema).default([]),
  spicyLevel: z.enum(['none', 'mild', 'medium', 'hot']).default('medium'),
  language: z.enum(['zh', 'en']).default('en'),
  learned: z.array(PreferenceEntrySchema).default([]),
  history: z.array(DiningHistorySchema).default([]),
});

export const SummarizeRequestSchema = z.object({
  messages: z.array(MessageSchema).min(1),
  preferences: UserPreferencesSchema,
  menuData: z.object({
    restaurantType: z.string().optional(),
  }).optional(),
});

export const SummarizeResponseSchema = z.object({
  summary: z.object({
    dishesOrdered: z.array(z.string()),
    dishesSkipped: z.array(z.string()),
    restaurantType: z.string().optional(),
    preferencesLearned: z.array(z.string()),
    keyMoments: z.array(z.string()).transform(arr => arr.slice(0, 3)),
  }),
  evolutions: z.array(z.object({
    action: z.enum(['add', 'strengthen', 'modify']),
    key: z.string(),
    entry: PreferenceEntrySchema.optional(),
    newConfidence: z.number().min(0).max(1).optional(),
    oldValue: z.string().optional(),
    newValue: z.string().optional(),
  })),
});

export type SummarizeRequest = z.infer<typeof SummarizeRequestSchema>;
export type SummarizeResponse = z.infer<typeof SummarizeResponseSchema>;
