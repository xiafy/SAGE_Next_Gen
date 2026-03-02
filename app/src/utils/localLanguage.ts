import type { CommunicationAction } from '../../../shared/types';

// ─── Allergy/Restriction Translation Table (Spec §6.2) ───

export const ALLERGY_TRANSLATIONS: Record<string, Record<string, string>> = {
  peanut:    { en: 'Peanut allergy',    zh: '花生过敏',     th: 'ไม่ทานถั่ว',               ja: 'ピーナッツアレルギー', ko: '땅콩 알레르기' },
  shellfish: { en: 'Shellfish allergy',  zh: '甲壳类过敏',   th: 'แพ้อาหารทะเลมีเปลือก',     ja: '甲殻類アレルギー',     ko: '갑각류 알레르기' },
  dairy:     { en: 'Dairy allergy',      zh: '乳制品过敏',   th: 'แพ้นม',                    ja: '乳製品アレルギー',     ko: '유제품 알레르기' },
  gluten:    { en: 'Gluten allergy',     zh: '麸质过敏',     th: 'แพ้กลูเตน',               ja: 'グルテンアレルギー',    ko: '글루텐 알레르기' },
  tree_nut:  { en: 'Tree nut allergy',   zh: '坚果过敏',     th: 'แพ้ถั่วเปลือกแข็ง',        ja: 'ナッツアレルギー',     ko: '견과류 알레르기' },
  egg:       { en: 'Egg allergy',        zh: '鸡蛋过敏',     th: 'แพ้ไข่',                   ja: '卵アレルギー',        ko: '달걀 알레르기' },
  soy:       { en: 'Soy allergy',        zh: '大豆过敏',     th: 'แพ้ถั่วเหลือง',            ja: '大豆アレルギー',      ko: '대두 알레르기' },
  fish:      { en: 'Fish allergy',       zh: '鱼类过敏',     th: 'แพ้ปลา',                   ja: '魚アレルギー',        ko: '생선 알레르기' },
  sesame:    { en: 'Sesame allergy',     zh: '芝麻过敏',     th: 'แพ้งา',                    ja: 'ゴマアレルギー',      ko: '참깨 알레르기' },
  vegetarian:{ en: 'Vegetarian',         zh: '素食',         th: 'มังสวิรัติ',               ja: 'ベジタリアン',        ko: '채식주의' },
  halal:     { en: 'Halal only',         zh: '清真',         th: 'ฮาลาล',                   ja: 'ハラール',           ko: '할랄' },
  vegan:     { en: 'Vegan',              zh: '纯素',         th: 'วีแกน',                    ja: 'ヴィーガン',          ko: '비건' },
};

export const ALLERGY_ICONS: Record<string, string> = {
  peanut: '🥜', shellfish: '🦐', dairy: '🥛', gluten: '🌾', tree_nut: '🌰',
  egg: '🥚', soy: '🫘', fish: '🐟', sesame: '⚪', vegetarian: '🥬', halal: '☪️', vegan: '🌱',
};

// ─── Communication Phrases (Spec §6.1) ───

export const COMM_PHRASES: Record<CommunicationAction, Record<string, string>> = {
  sold_out: {
    en: 'Sold out', zh: '没有了', th: 'ไม่มี', ja: '売り切れ',
    ko: '품절', fr: 'Épuisé', es: 'Agotado', it: 'Esaurito', de: 'Ausverkauft',
  },
  change: {
    en: 'Change this', zh: '换一道', th: 'เปลี่ยน', ja: '変更',
    ko: '변경', fr: 'Changer', es: 'Cambiar', it: 'Cambiare', de: 'Ändern',
  },
  add_more: {
    en: 'One more', zh: '加一份', th: 'เพิ่ม', ja: 'もう一つ',
    ko: '추가', fr: 'Encore un', es: 'Uno más', it: 'Ancora uno', de: 'Noch eins',
  },
  other: {
    en: 'Other question', zh: '其他问题', th: 'อื่นๆ', ja: 'その他',
    ko: '기타', fr: 'Autre', es: 'Otro', it: 'Altro', de: 'Sonstiges',
  },
};

export const COMM_ICONS: Record<CommunicationAction, string> = {
  sold_out: '🚫',
  change: '🔄',
  add_more: '➕',
  other: '❓',
};

export function getPhrase(action: CommunicationAction, lang: string): string {
  const phrases = COMM_PHRASES[action];
  return phrases[lang] ?? phrases["en"] ?? "";
}

export function getAllergyLabel(allergen: string, lang: string): string {
  const entry = ALLERGY_TRANSLATIONS[allergen]; return entry?.[lang] ?? entry?.en ?? allergen;
}

export function getAllergyIcon(allergen: string): string {
  return ALLERGY_ICONS[allergen] ?? '⚠️';
}
