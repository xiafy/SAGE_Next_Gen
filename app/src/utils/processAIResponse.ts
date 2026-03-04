import { extractJsonBlock, parseJsonBlock, stripJsonCodeBlocks } from './streamJsonParser';
import type { MealPlan, OrderAction, Recommendation, PreferenceUpdate } from '../../../shared/types';

export interface ProcessAIResponseInput {
  fullText: string;
  mode: 'pre_chat' | 'chat';
  chatPhase: string;
  menuItemIds: Set<string>;
  language: string;
  replacingVersion: number | null;
}

export interface MessageToAdd {
  role: 'assistant';
  content: string;
  cardType?: 'mealPlan';
  cardData?: MealPlan;
}

export interface ProcessAIResponseResult {
  messages: MessageToAdd[];
  chatPhaseTransition?: 'chatting';
  orderAction?: OrderAction;
  preferenceUpdates?: PreferenceUpdate[];
  mealPlanVersion?: number;
  quickReplies: string[];
  recommendations: Recommendation[];
  toasts: string[];
}

export function processAIResponse(input: ProcessAIResponseInput): ProcessAIResponseResult {
  const isZh = input.language.startsWith('zh');
  let displayText = input.fullText;
  let quickReplies: string[] = [];
  let recommendations: Recommendation[] = [];
  let preferenceUpdates: PreferenceUpdate[] | undefined;
  let orderAction: OrderAction | undefined;
  let mealPlanVersion: number | undefined;
  const messages: MessageToAdd[] = [];
  const toasts: string[] = [];

  const chatPhaseTransition = input.mode === 'chat' && input.chatPhase === 'handing_off'
    ? 'chatting'
    : undefined;

  const tryParseChatJson = (text: string): boolean => {
    try {
      let jsonContent = text;
      try {
        JSON.parse(jsonContent);
      } catch {
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch?.[1]) {
          jsonContent = codeBlockMatch[1];
        } else {
          const braceMatch = text.match(/(\{[\s\S]*"message"[\s\S]*\})\s*$/);
          if (braceMatch?.[1]) {
            jsonContent = braceMatch[1];
          } else {
            throw new Error('no json found');
          }
        }
      }

      const parsedObj: unknown = JSON.parse(jsonContent);
      const obj = parsedObj as Record<string, unknown>;

      if (typeof obj['message'] === 'string') {
        displayText = obj['message'];
      }

      if (Array.isArray(obj['quickReplies'])) {
        quickReplies = (obj['quickReplies'] as unknown[]).filter((qr): qr is string => typeof qr === 'string');
      }

      if (Array.isArray(obj['recommendations'])) {
        recommendations = (obj['recommendations'] as unknown[])
          .map((rec) => rec as Record<string, unknown>)
          .filter(
            (rec) => typeof rec.itemId === 'string' && input.menuItemIds.has(rec.itemId)
              && typeof rec.reason === 'string',
          )
          .map((rec) => ({ itemId: rec.itemId as string, reason: rec.reason as string }));
      }

      if (Array.isArray(obj['preferenceUpdates']) && obj['preferenceUpdates'].length > 0) {
        preferenceUpdates = obj['preferenceUpdates'] as PreferenceUpdate[];
      }

      return typeof obj['message'] === 'string';
    } catch {
      return false;
    }
  };

  const jsonStr = extractJsonBlock(input.fullText);
  if (jsonStr) {
    const parsed = parseJsonBlock(jsonStr);

    if (parsed) {
      displayText = stripJsonCodeBlocks(input.fullText);

      if (parsed.type === 'mealPlan') {
        const computedVersion = input.replacingVersion != null
          ? input.replacingVersion + 1
          : parsed.data.version;

        const mealPlanCard: MealPlan = {
          ...parsed.data,
          version: computedVersion,
        };

        mealPlanVersion = computedVersion;

        if (displayText) {
          messages.push({ role: 'assistant', content: displayText });
        }

        messages.push({
          role: 'assistant',
          content: '',
          cardType: 'mealPlan',
          cardData: mealPlanCard,
        });

        return {
          messages,
          chatPhaseTransition,
          mealPlanVersion,
          quickReplies: [],
          recommendations: [],
          toasts,
        };
      }

      if (parsed.type === 'orderAction') {
        orderAction = parsed.data;
        if (orderAction.orderAction === 'add') {
          toasts.push(isZh ? '已添加到点菜单' : 'Added to order');
        } else if (orderAction.orderAction === 'remove') {
          toasts.push(isZh ? '已从点菜单移除' : 'Removed from order');
        } else if (orderAction.orderAction === 'replace') {
          toasts.push(isZh ? '已替换菜品' : 'Dish replaced');
        }
      }
    } else if (!tryParseChatJson(jsonStr)) {
      displayText = stripJsonCodeBlocks(input.fullText) || input.fullText;
      quickReplies = [isZh ? '🔄 重新生成方案' : '🔄 Regenerate'];
    }
  } else {
    tryParseChatJson(input.fullText);
  }

  messages.push({ role: 'assistant', content: displayText });

  return {
    messages,
    chatPhaseTransition,
    orderAction,
    preferenceUpdates,
    mealPlanVersion,
    quickReplies,
    recommendations,
    toasts,
  };
}
