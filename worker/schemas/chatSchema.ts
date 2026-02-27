import { z } from 'zod';

/** 前端发来的 preference update */
export const PreferenceUpdateSchema = z.object({
  type:     z.enum(['restriction', 'flavor', 'other']),
  action:   z.enum(['add', 'remove']),
  value:    z.string().min(1),
  strength: z.number().min(1).max(3).default(2),
});

/** Pre-Chat AI 返回 schema */
export const PreChatResponseSchema = z.object({
  message:          z.string().min(1),
  quickReplies:     z.array(z.string()).default([]),
  preferenceUpdates: z.array(PreferenceUpdateSchema).default([]),
});

/** 推荐菜品 */
export const RecommendationSchema = z.object({
  itemId: z.string().min(1),
  reason: z.string().min(1),
});

/** 主 Chat AI 返回 schema */
export const AgentChatResponseSchema = z.object({
  message:          z.string().min(1),
  recommendations:  z.array(RecommendationSchema).default([]),
  quickReplies:     z.array(z.string()).default([]),
  preferenceUpdates: z.array(PreferenceUpdateSchema).default([]),
  triggerExplore:   z.boolean().default(false),
});

/** 前端发来的 chat 请求 */
const MessageSchema = z.object({
  role:    z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const LocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

export const ChatRequestSchema = z.object({
  mode:     z.enum(['pre_chat', 'chat']),
  messages: z.array(MessageSchema).max(100),
  menuData: z.record(z.unknown()).nullable(),
  preferences: z.object({
    restrictions: z.array(z.unknown()).default([]),
    flavors:      z.array(z.unknown()).default([]),
    history:      z.array(z.unknown()).default([]),
  }).default({}),
  context: z.object({
    language:  z.enum(['zh', 'en']),
    timestamp: z.number(),
    location:  LocationSchema.optional(),
  }),
});

/** 前端发来的 analyze 请求 */
export const AnalyzeRequestSchema = z.object({
  images: z.array(z.object({
    data:     z.string().min(1),          // base64
    mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  })).min(1).max(5),
  context: z.object({
    language:  z.enum(['zh', 'en']),
    timestamp: z.number(),
    location:  LocationSchema.optional(),
  }),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type PreChatResponse = z.infer<typeof PreChatResponseSchema>;
export type AgentChatResponse = z.infer<typeof AgentChatResponseSchema>;
export type PreferenceUpdate = z.infer<typeof PreferenceUpdateSchema>;
