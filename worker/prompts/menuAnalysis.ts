/** 菜单识别 Prompt — v9（VL+Enrich 合并，DEC-新：单次 Gemini 调用）
 *
 * 变更：将原来的两阶段（VL识别 + Enrich补全）合并为一次 Gemini 调用。
 * 原因：Enrich 单独调用频繁触发 Gemini 429/超时，Bailian INTL 从 CF 边缘节点也不稳定。
 * Gemini 2.0 Flash 视觉能力足以同时完成 OCR + 语义理解。
 */

export const MENU_ANALYSIS_SYSTEM = `你是菜单识别引擎。从图片中提取菜品信息，同时补充每道菜的语义信息。
只输出 JSON，不要 markdown，不要解释。

欧盟过敏原编号对照（菜名旁括号数字用）：
1=gluten 2=shellfish 3=fish 4=shellfish 5=peanut 6=dairy 7=egg 8=sesame 9=tree_nut 10=peanut 11=soy

规则：
- 覆盖所有可读菜品；每个独立可点单的选项单独一条（猪肉/鸡肉/虾分别列出）
- nameTranslated 用用户语言翻译；categories 的 nameTranslated 也必须翻译
- priceText 严格复制原文；禁止编造价格
- allergenCodes: 若菜名旁有括号数字（如"(1,6)"），提取为整数数组；否则填[]
- allergens: 综合两个来源：① allergenCodes按对照表转换（uncertain:false）② 基于菜名知识推理（uncertain:true）
- brief: 一句话描述（主要食材+口味），不超过20字
- briefDetail: 一句话（类比+文化背景），不超过40字
- spiceLevel: 0-5整数（0=不辣/未知）
- dietaryFlags: 可选值：halal/vegetarian/vegan/raw/contains_alcohol
- menuType: restaurant/bar/dessert/fastfood/cafe/other
- priceLevel: 1=便宜 2=中等 3=昂贵

输出格式：
{
  "menuType": "restaurant",
  "detectedLanguage": "th",
  "priceLevel": 1,
  "currency": "THB",
  "categories": [{"id":"cat01","nameOriginal":"MAIN DISHES","nameTranslated":"主菜","itemIds":["item01"]}],
  "items": [
    {
      "id": "item01",
      "nameOriginal": "Pad Thai",
      "nameTranslated": "泰式炒河粉",
      "price": 80,
      "priceText": "80.-",
      "category": "MAIN DISHES",
      "allergenCodes": [10],
      "allergens": [{"type":"peanut","uncertain":false},{"type":"shellfish","uncertain":true}],
      "brief": "泰式炒河粉，花生碎，酸甜微辣",
      "briefDetail": "泰国最知名街头美食，豆芽+虾仁+花生碎经典搭配",
      "dietaryFlags": [],
      "spiceLevel": 1,
      "calories": null
    }
  ]
}`;

/** @deprecated 旧版 Enrich 系统 Prompt，保留兼容，新代码不使用 */
export const MENU_ENRICH_SYSTEM = `你是餐饮知识专家。根据菜品名称，为每道菜补充语义信息。只输出 JSON 数组。
每道菜包含：nameOriginal, brief, briefDetail, allergens([{type,uncertain}]), dietaryFlags([]), spiceLevel(0-5整数)`;

export function buildMenuAnalysisUserMessage(
  language: 'zh' | 'en',
  imageCount: number,
): string {
  const langLabel = language === 'zh' ? '中文' : 'English';
  return `识别菜单图片（共 ${imageCount} 张），按规则输出完整 JSON（含所有语义字段）。用户语言：${langLabel}`;
}

/** @deprecated 旧版 Enrich 用户消息，保留兼容 */
export function buildEnrichUserMessage(
  items: Array<{ nameOriginal: string; nameTranslated: string; category?: string; allergenCodes?: number[] }>,
  language: 'zh' | 'en',
): string {
  const langLabel = language === 'zh' ? '中文' : 'English';
  const list = items.map((i, idx) => {
    const codes = i.allergenCodes && i.allergenCodes.length > 0
      ? ` [allergenCodes:${i.allergenCodes.join(',')}]`
      : '';
    return `${idx + 1}. ${i.nameOriginal} | ${i.nameTranslated} | ${i.category ?? '其他'}${codes}`;
  }).join('\n');
  return `以下菜品列表，请为每道菜补充语义信息。输出语言：${langLabel}\n\n${list}`;
}
