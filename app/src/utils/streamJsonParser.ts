import type { MealPlan, OrderAction } from '../../../shared/types';

/**
 * Extract the last ```json ... ``` code block from text.
 * If the last ```json has no closing ```, takes content to end of text.
 */
export function extractJsonBlock(fullText: string): string | null {
  const marker = '```json';
  let lastIdx = -1;
  let searchFrom = 0;
  while (true) {
    const idx = fullText.indexOf(marker, searchFrom);
    if (idx === -1) break;
    lastIdx = idx;
    searchFrom = idx + marker.length;
  }

  if (lastIdx === -1) return null;

  const startContent = lastIdx + marker.length;
  const contentStart = fullText[startContent] === '\n' ? startContent + 1 : startContent;

  const closeIdx = fullText.indexOf('```', contentStart);
  if (closeIdx === -1) {
    const content = fullText.slice(contentStart).trim();
    return content || null;
  }

  const content = fullText.slice(contentStart, closeIdx).trim();
  return content || null;
}

/**
 * Classify a parsed object as mealPlan or orderAction.
 */
export function classifyJsonBlock(obj: unknown): 'mealPlan' | 'orderAction' | null {
  if (typeof obj !== 'object' || obj === null) return null;
  const o = obj as Record<string, unknown>;
  if ('courses' in o && Array.isArray(o.courses)) return 'mealPlan';
  if ('orderAction' in o && typeof o.orderAction === 'string' && ['add', 'remove', 'replace'].includes(o.orderAction)) return 'orderAction';
  return null;
}

/**
 * Try to fix truncated JSON with simple heuristics.
 */
function tryRepairJson(str: string): string {
  let s = str.trim();
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Remove trailing comma at end
  s = s.replace(/,\s*$/, '');

  // Count unmatched brackets
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // If we're inside a string, close it
  if (inString) s += '"';

  // Remove trailing comma again after potential string close
  s = s.replace(/,\s*$/, '');

  // Close brackets and braces
  while (brackets > 0) { s += ']'; brackets--; }
  while (braces > 0) { s += '}'; braces--; }

  return s;
}

/**
 * Parse a JSON string with fallback repair.
 * L1: Direct JSON.parse
 * L2: Attempt repair (trailing commas, close brackets)
 * L3: Return null
 */
export function parseJsonBlock(
  jsonStr: string,
): { type: 'mealPlan'; data: MealPlan } | { type: 'orderAction'; data: OrderAction } | null {
  let obj: unknown;

  // L1
  try {
    obj = JSON.parse(jsonStr);
  } catch {
    // L2
    try {
      const repaired = tryRepairJson(jsonStr);
      obj = JSON.parse(repaired);
    } catch {
      // L3
      return null;
    }
  }

  const classification = classifyJsonBlock(obj);
  if (classification === 'mealPlan') {
    const o = obj as Record<string, unknown>;
    if (!Array.isArray(o.courses) || o.courses.length === 0 || typeof o.version !== 'number' || typeof o.totalEstimate !== 'number') {
      return null; // L3: schema validation failed
    }
    return { type: 'mealPlan', data: obj as MealPlan };
  }
  if (classification === 'orderAction') {
    return { type: 'orderAction', data: obj as OrderAction };
  }
  return null;
}
