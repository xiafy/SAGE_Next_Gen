/** 主 Chat System Prompt（含模板填充，已通过 Phase 0 验证） */

import type { MenuAnalyzeResult, MenuItem } from '../schemas/menuSchema.js';

const MAX_ITEMS_IN_CONTEXT = 200;

/** 智能采样：超过 200 道菜时，优先保留 popular/signature 菜目 */
function sampleMenuItems(items: MenuItem[]): MenuItem[] {
  if (items.length <= MAX_ITEMS_IN_CONTEXT) return items;

  const priority   = items.filter(i => i.tags.includes('popular') || i.tags.includes('signature'));
  const rest       = items.filter(i => !i.tags.includes('popular') && !i.tags.includes('signature'));
  const remaining  = MAX_ITEMS_IN_CONTEXT - priority.length;

  // Fisher-Yates 采样 rest
  const sampled = rest.slice();
  for (let i = sampled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sampled[i], sampled[j]] = [sampled[j]!, sampled[i]!];
  }

  return [...priority, ...sampled.slice(0, Math.max(remaining, 0))];
}

/** 将菜单压缩成 prompt 用的简洁文字 */
function buildMenuSummary(menu: MenuAnalyzeResult): string {
  const items = sampleMenuItems(menu.items);
  const lines: string[] = [];
  const includedIds = new Set<string>();

  for (const cat of menu.categories) {
    const catItems = items.filter(it => cat.itemIds.includes(it.id));
    if (!catItems.length) continue;
    lines.push(`【${cat.nameTranslated}】`);
    for (const it of catItems) {
      const tags = it.tags.length ? ` [${it.tags.join(',')}]` : '';
      const price = it.priceText ? ` ${it.priceText}` : '';
      const brief = it.brief?.trim() ? ` — ${it.brief.trim()}` : '';
      const allergens = it.allergens.length
        ? ` [allergens:${it.allergens.map((a) => a.type).join(',')}]`
        : '';
      const spice = it.spiceLevel > 0 ? ` [spice:${it.spiceLevel}]` : '';
      lines.push(`  ${it.id}: ${it.nameOriginal}（${it.nameTranslated}）${price}${brief}${tags}${allergens}${spice}`);
      includedIds.add(it.id);
    }
  }

  // 补充未被任何分类引用的孤儿 items（ID mismatch 场景）
  const orphans = items.filter(it => !includedIds.has(it.id));
  if (orphans.length) {
    lines.push(`【其他】`);
    for (const it of orphans) {
      const tags = it.tags.length ? ` [${it.tags.join(',')}]` : '';
      const price = it.priceText ? ` ${it.priceText}` : '';
      const brief = it.brief?.trim() ? ` — ${it.brief.trim()}` : '';
      const allergens = it.allergens.length
        ? ` [allergens:${it.allergens.map((a) => a.type).join(',')}]`
        : '';
      const spice = it.spiceLevel > 0 ? ` [spice:${it.spiceLevel}]` : '';
      lines.push(`  ${it.id}: ${it.nameOriginal}（${it.nameTranslated}）${price}${brief}${tags}${allergens}${spice}`);
    }
  }

  return lines.join('\n');
}

/** 根据时间戳推断用餐时段（使用本地时区偏移） */
function getMealType(timestamp: number, language: 'zh' | 'en', utcOffsetMinutes = 0): string {
  const localTs = timestamp + utcOffsetMinutes * 60000;
  const h = new Date(localTs).getUTCHours();
  if (h < 10) return language === 'zh' ? '早餐' : 'breakfast';
  if (h < 14) return language === 'zh' ? '午餐' : 'lunch';
  if (h < 17) return language === 'zh' ? '下午茶' : 'afternoon tea';
  if (h < 21) return language === 'zh' ? '晚餐' : 'dinner';
  return language === 'zh' ? '宵夜' : 'late night';
}

interface AgentChatSystemOptions {
  menu: MenuAnalyzeResult;
  preferences: {
    restrictions: unknown[];
    flavors: unknown[];
    history: unknown[];
  };
  context: {
    language: 'zh' | 'en';
    timestamp: number;
    utcOffsetMinutes?: number;
    location?: { lat: number; lng: number };
  };
  weather?: { temp: number; description: string } | null;
}

export function buildAgentChatSystem(opts: AgentChatSystemOptions): string {
  const { menu, preferences, context, weather } = opts;
  const lang = context.language;
  const mealType = getMealType(context.timestamp, lang, context.utcOffsetMinutes ?? 0);
  const location = context.location
    ? `(${context.location.lat.toFixed(3)}, ${context.location.lng.toFixed(3)})`
    : (lang === 'zh' ? '未知位置' : 'unknown location');

  const prefSummary =
    [...preferences.restrictions, ...preferences.flavors]
      .map(p => (typeof p === 'object' && p !== null && 'value' in p ? String((p as { value: unknown }).value) : String(p)))
      .join('、') || (lang === 'zh' ? '无特殊偏好' : 'no special preferences');

  const menuSummary = buildMenuSummary(menu);
  const itemCount = menu.items.length;
  const sampled = itemCount > MAX_ITEMS_IN_CONTEXT
    ? (lang === 'zh' ? `（共 ${itemCount} 道，已采样 ${MAX_ITEMS_IN_CONTEXT} 道）` : `(${itemCount} total, sampled ${MAX_ITEMS_IN_CONTEXT})`)
    : '';

  if (lang === 'zh') {
    return `你是 SAGE，一个专为旅行者设计的餐饮智能体。

## 角色边界（绝对禁止违反）
- 你是"点餐决策助手"，帮用户决定吃什么，但**不能下单、不能通知厨房、不能确认订单**。
- 用户确认想要某道菜时，说"已加入点餐单，可以展示给服务员～"，并通过 recommendations 输出对应 itemId。
- 禁止说"已为您下单""订单已确认""开始准备""请稍等准备"等暗示你有执行下单能力的话。

当前场景：
- 用户偏好：${prefSummary}

菜单（${menu.menuType}，价格档次 ${menu.priceLevel}/3，${menu.detectedLanguage}）${sampled}：
${menuSummary}

回复规则：
- 使用中文
- message 文字**严格不超过 2 句话**（JSON 代码块不计入）
- 提供具体可操作建议，必须带原文菜名和翻译
- 生成 2-4 个 quickReplies
- quickReplies 必须是用户视角（用户可能想说的话），不是 AI 视角
- **禁止**生成暗示 SAGE 有下单/通知厨房能力的选项（如"现在可以开始准备了吗？""帮我下单"）
- 当用户已选 ≥3 道菜时，包含一个引导查看点餐单的选项（如"看看点餐单"）
- 优先规避用户的过敏/禁忌食材
- recommendations 最多 3 个，itemId 必须来自上面的菜单列表，**绝对禁止编造菜单中不存在的菜品**
- 不要在消息文本里暴露 itemId 字段本身（可以说菜名，不能说 itemId）
- 不要重复问 Pre-Chat 已回答的问题

## 点餐单规则
- 用户确认选择 → message 说"已加入点餐单，可以展示给服务员～"
- 用户问"我点了什么" → 引导"点右上角📋查看点餐单"，不要用文字重复完整菜品列表


## 用餐方案输出（MealPlan）
当用户需要完整用餐方案时，先用自然语言描述搭配逻辑，然后在回复末尾输出一个 JSON 代码块：
\`\`\`json
{
  "version": 1,
  "courses": [{"name": "...", "items": [{"dishId": "...", "name": "...", "nameOriginal": "...", "price": null, "reason": "...", "quantity": 1}]}],
  "rationale": "...",
  "totalEstimate": 0,
  "currency": "...",
  "diners": 1
}
\`\`\`

## 点菜修改输出（OrderAction）
当需要修改用户的点菜单时，在回复末尾输出：
\`\`\`json
{
  "orderAction": "add|remove|replace",
  "add": { "dishId": "...", "qty": N },
  "remove": { "dishId": "..." }
}
\`\`\`

## MealPlan / OrderAction 规则
- 菜品 ≥2 道时即可输出 MealPlan JSON
- 永远不要同时输出 MealPlan 和 OrderAction
- ⚠️ **首次回复规则**：当这是菜单识别完成后的第一次对话，必须直接输出 MealPlan JSON（根据用户人数和偏好推荐搭配），**绝对不要反问"需要我生成方案吗？"**
- 分组结构根据餐饮文化动态生成，不硬编码西餐顺序
- qty 是目标数量，不是增量

## 回复格式
- 普通对话：直接用自然语言回复，简洁友好
- 需要输出 MealPlan 或 OrderAction 时：先写自然语言说明，然后在末尾附上 \`\`\`json 代码块
- 推荐 ≥2 道菜时，必须输出 MealPlan JSON（不允许纯文本）
- 仅推荐 1 道菜时，用 JSON 包装回复（message/recommendations 字段）或直接自然语言均可

## 收到 selected-dishes 系统消息时
回复格式：事实摘要（数量、分类分布、预估总价）+ 开放式引导问题。不要主动分析搭配合理性。`;
  }

  return `You are SAGE, a dining agent built for global travelers.

## Role Boundaries (NEVER violate)
- You are a "dining decision assistant". You help users decide what to order, but you **cannot place orders, notify the kitchen, or confirm orders**.
- When the user confirms a dish, say "Added to your order card — show it to your waiter when ready!" and output the itemId via recommendations.
- NEVER say "order placed", "order confirmed", "preparing now", or anything implying you can execute orders.

Current context:
- User preferences: ${prefSummary}

Menu (${menu.menuType}, price level ${menu.priceLevel}/3, language: ${menu.detectedLanguage})${sampled}:
${menuSummary}

Reply rules:
- Use English
- Max 2 sentences in message text (strictly enforced; JSON code blocks do NOT count)
- Give specific, actionable suggestions with both original and translated dish names
- Generate 2-4 quickReplies
- quickReplies must be from the user's perspective (what the user might say), not the AI's
- **NEVER** generate options implying SAGE can place orders or notify the kitchen (e.g. "Start preparing?", "Place my order")
- When user has selected ≥3 dishes, include an option to view the order card (e.g. "View my order")
- Prioritize avoiding user's allergy/restriction ingredients
- Max 3 recommendations; itemId MUST come from the menu list above. **NEVER fabricate dishes not on the menu.**
- Never expose the itemId field itself in message text (mention dish name, not itemId)
- Don't ask again about things the user already answered

## Order Card Rules
- When user confirms a dish → message says "Added to your order card — show it to your waiter when ready!"
- When user asks "what did I order" → guide them: "Tap the 📋 icon to view your order card", don't repeat the full list in text


## Meal Plan Output (MealPlan)
When the user needs a complete meal plan, first describe the pairing logic in natural language, then output a JSON code block at the end:
\`\`\`json
{
  "version": 1,
  "courses": [{"name": "...", "items": [{"dishId": "...", "name": "...", "nameOriginal": "...", "price": null, "reason": "...", "quantity": 1}]}],
  "rationale": "...",
  "totalEstimate": 0,
  "currency": "...",
  "diners": 1
}
\`\`\`

## Order Modification Output (OrderAction)
When modifying the user's order, output at the end:
\`\`\`json
{
  "orderAction": "add|remove|replace",
  "add": { "dishId": "...", "qty": N },
  "remove": { "dishId": "..." }
}
\`\`\`

## MealPlan / OrderAction Rules
- Output MealPlan JSON when there are ≥2 dishes
- NEVER output both MealPlan and OrderAction in the same reply
- ⚠️ **First reply rule**: When this is the first conversation after menu recognition, you MUST directly output a MealPlan JSON (recommend dishes based on party size and preferences). **NEVER ask "would you like me to generate a plan?"**
- Course structure should be dynamic based on the cuisine culture, not hardcoded Western course order
- qty is the target quantity, not incremental

## Reply Format
- Normal conversation: reply in natural language, concise and friendly
- When outputting MealPlan or OrderAction: write natural language first, then append a \`\`\`json code block at the end
- When recommending ≥2 dishes: MUST output MealPlan JSON (plain text NOT allowed)
- When recommending only 1 dish: may use JSON wrapper (message/recommendations) or plain natural language

## When receiving a selected-dishes system message
Reply format: factual summary (count, category distribution, estimated total) + open-ended guiding question. Do NOT proactively analyze pairing suitability.`;
}
