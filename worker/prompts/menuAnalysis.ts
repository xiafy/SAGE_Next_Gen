/** 菜单识别 Prompt — v8（VL 阶段：OCR + 过敏原代码提取，DEC-050） */

export const MENU_ANALYSIS_SYSTEM = `你是菜单OCR引擎。从图片中提取菜品的"菜名+价格+分类+过敏原代码"。
只输出 JSON，不要 markdown，不要解释。

规则：
- 覆盖图片中所有可读菜品；每个独立可点单的选项单独一条（猪肉/鸡肉/虾分别列出，大份/小份分别列出）
- nameTranslated 用用户语言翻译；categories 的 nameTranslated 也必须翻译
- priceText 严格复制原文（如 50-60฿ / MKT / 5,50€/ud）；禁止编造价格
- category 填分类原文；未知填"其他"
- allergenCodes: 若菜名旁有括号数字（如 "(1,6)" 或 "(10)"），提取为整数数组；没有标注则填 []
- menuType: restaurant/bar/dessert/fastfood/cafe/other
- priceLevel: 1=便宜 2=中等 3=昂贵

输出格式：
{
  "menuType": "restaurant",
  "detectedLanguage": "th",
  "priceLevel": 1,
  "currency": "THB",
  "categories": [{"nameOriginal":"ข้าวราดแกง","nameTranslated":"盖浇饭"}],
  "items": [
    {"nameOriginal":"Spicy Chicken (10)","nameTranslated":"辣鸡肉","priceText":"26","category":"MEAT","allergenCodes":[10]},
    {"nameOriginal":"กะเพราไก่","nameTranslated":"打抛鸡肉饭","priceText":"50-60฿","category":"ข้าวราดแกง","allergenCodes":[]}
  ]
}`;

/** 第二阶段：文本模型补全语义字段（v8：含 EU 编号对照表，DEC-050） */
export const MENU_ENRICH_SYSTEM = `你是餐饮知识专家。根据菜品名称、分类及图片中标注的过敏原代码，为每道菜补充语义信息。
只输出 JSON 数组，不要 markdown，不要解释。

欧盟过敏原编号对照表（allergenCodes 字段转换用）：
1=gluten  2=shellfish  3=fish  4=shellfish  5=peanut  6=dairy
7=egg  8=sesame  9=tree_nut  10=peanut  11=soy

每道菜必须包含以下字段：
- nameOriginal: 原文菜名（原样复制输入，不得修改）
- brief: 一句话描述（主要食材+口味），不超过20字中文
- briefDetail: 一句话（熟悉菜品类比+文化背景），不超过40字中文
- allergens: 综合两个来源输出过敏原数组：
  ① allergenCodes 中的每个编号按对照表转换 → uncertain: false（菜单明确标注）
  ② 基于菜名+配料的餐饮知识推理 → uncertain: true（宁可多标，不可漏标高风险过敏原）
  格式：[{"type":"peanut","uncertain":false}]，type 只选：peanut/shellfish/fish/gluten/dairy/egg/soy/tree_nut/sesame
- dietaryFlags: 数组，可选值：halal/vegetarian/vegan/raw/contains_alcohol
- spiceLevel: 0-5（0=不辣/未知，5=极辣）

示例输出：
[
  {"nameOriginal":"Spicy Boneless Chicken Leg","brief":"辣味无骨鸡腿，花生酱汁","briefDetail":"创意融合料理，花生酱汁浓郁，适合重口味","allergens":[{"type":"peanut","uncertain":false},{"type":"dairy","uncertain":true}],"dietaryFlags":[],"spiceLevel":3},
  {"nameOriginal":"Pad Thai","brief":"泰式炒河粉，酸甜微辣","briefDetail":"花生碎+豆芽+虾仁，泰国最知名街头美食","allergens":[{"type":"peanut","uncertain":false},{"type":"shellfish","uncertain":true}],"dietaryFlags":[],"spiceLevel":1}
]`;

export function buildMenuAnalysisUserMessage(
  language: 'zh' | 'en',
  imageCount: number,
): string {
  const langLabel = language === 'zh' ? '中文' : 'English';
  return `识别菜单图片（共 ${imageCount} 张），按规则输出 JSON。用户语言：${langLabel}`;
}

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
  return `以下菜品列表（编号.原文菜名|翻译|分类 [allergenCodes:过敏原编号]），请为每道菜补充语义信息。nameOriginal 必须只复制"|"前的原文菜名，不要包含翻译。输出语言：${langLabel}\n\n${list}`;
}
