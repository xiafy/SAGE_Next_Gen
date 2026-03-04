import { describe, it, expect } from 'vitest';
import { extractJsonBlock, parseJsonBlock, classifyJsonBlock } from '../streamJsonParser';

describe('extractJsonBlock', () => {
  it('extracts json from normal text + code block', () => {
    const text = 'Here is my plan:\n```json\n{"version":1}\n```\nDone.';
    expect(extractJsonBlock(text)).toBe('{"version":1}');
  });

  it('returns last block when multiple ```json exist', () => {
    const text = '```json\n{"first":true}\n```\ntext\n```json\n{"second":true}\n```';
    expect(extractJsonBlock(text)).toBe('{"second":true}');
  });

  it('returns null when no ```json', () => {
    expect(extractJsonBlock('just normal text')).toBeNull();
  });

  it('takes to end of text when no closing ```', () => {
    const text = 'Some text\n```json\n{"partial":true}';
    expect(extractJsonBlock(text)).toBe('{"partial":true}');
  });
});

describe('classifyJsonBlock', () => {
  it('classifies mealPlan', () => {
    expect(classifyJsonBlock({ courses: [], version: 1 })).toBe('mealPlan');
  });

  it('classifies orderAction', () => {
    expect(classifyJsonBlock({ orderAction: 'add', add: { dishId: 'x', qty: 1 } })).toBe('orderAction');
  });

  it('returns null for unknown', () => {
    expect(classifyJsonBlock({ foo: 'bar' })).toBeNull();
  });

  it('returns null for non-object', () => {
    expect(classifyJsonBlock('string')).toBeNull();
    expect(classifyJsonBlock(null)).toBeNull();
  });
});

describe('parseJsonBlock', () => {
  it('L1: parses valid MealPlan JSON', () => {
    const json = JSON.stringify({
      version: 1,
      totalEstimate: 500,
      currency: 'THB',
      rationale: 'test',
      courses: [{ name: 'Main', items: [] }],
      diners: 2,
    });
    const result = parseJsonBlock(json);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
    expect(result!.data).toHaveProperty('courses');
  });

  it('L1: parses valid OrderAction JSON', () => {
    const json = JSON.stringify({
      orderAction: 'add',
      add: { dishId: 'dish-1', qty: 2 },
    });
    const result = parseJsonBlock(json);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('orderAction');
  });

  it('L2: repairs truncated JSON (missing closing brackets)', () => {
    const json = '{"version":1,"courses":[{"name":"Main","items":[]}],"rationale":"ok","totalEstimate":100,"currency":"USD","diners":2';
    const result = parseJsonBlock(json);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
  });

  it('L3: returns null for garbage text', () => {
    expect(parseJsonBlock('not json at all!!!')).toBeNull();
  });

  it('🟡-6: MealPlan + OrderAction both present → returns MealPlan (priority)', () => {
    // classifyJsonBlock checks courses first, so an object with both should be mealPlan
    const json = JSON.stringify({
      courses: [{ name: 'Main', items: [{ dishId: 'd1', name: 'Test', nameOriginal: 'T', price: 10, reason: '', quantity: 1 }] }],
      version: 2,
      totalEstimate: 100,
      currency: 'THB',
      rationale: 'test',
      diners: 2,
      orderAction: 'add',
    });
    const result = parseJsonBlock(json);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
  });

  it('🟡-6: courses is empty array → schema validation fails, returns null', () => {
    const json = JSON.stringify({
      version: 1,
      totalEstimate: 100,
      currency: 'THB',
      rationale: 'test',
      courses: [],
      diners: 2,
    });
    const result = parseJsonBlock(json);
    expect(result).toBeNull();
  });

  it('🟡-6: orderAction value is illegal (delete) → returns null', () => {
    const json = JSON.stringify({
      orderAction: 'delete',
      remove: { dishId: 'dish-1' },
    });
    const result = parseJsonBlock(json);
    expect(result).toBeNull();
  });
});
describe('parseJsonBlock — supplemental', () => {
  it('version is not a number → schema validation fails', () => {
    const json = JSON.stringify({
      version: 'one',
      totalEstimate: 100,
      currency: 'THB',
      rationale: 'test',
      courses: [{ name: 'Main', items: [{ dishId: 'd1', name: 'T', nameOriginal: 'T', price: 10, reason: '', quantity: 1 }] }],
      diners: 2,
    });
    const result = parseJsonBlock(json);
    expect(result).toBeNull();
  });
});

describe('extractJsonBlock — supplemental', () => {
  it('nested ```json blocks (AI code example) → takes last one', () => {
    const text = 'Here is an example:\n````markdown\n```json\n{"fake":true}\n```\n````\nNow the real output:\n```json\n{"courses":[{"name":"Main","items":[]}],"version":1,"totalEstimate":100,"currency":"THB","rationale":"ok","diners":2}\n```';
    const result = extractJsonBlock(text);
    expect(result).toContain('"version":1');
  });
});

describe('F06-AC12: JSON code block detection during streaming', () => {
  it('F06-AC12: detects ```json opening marker in partial stream', () => {
    const partialStream = 'Here is the meal plan I recommend for you:\n```json\n{"version":1';
    const extracted = extractJsonBlock(partialStream);
    // Even without closing ```, extractJsonBlock should return the partial content
    expect(extracted).not.toBeNull();
    expect(extracted).toContain('"version":1');
  });

  it('F06-AC12: no ```json marker → returns null (still streaming text)', () => {
    const partialStream = 'Let me think about the best dishes for your group...';
    expect(extractJsonBlock(partialStream)).toBeNull();
  });

  it('F06-AC12: incomplete JSON (missing one closing brace) → parseJsonBlock L2 repairs', () => {
    // Missing only the final closing brace — L2 repair should handle this
    const truncated = '{"version":1,"totalEstimate":500,"currency":"THB","rationale":"good","diners":2,"courses":[{"name":"Main","items":[{"dishId":"d1","name":"Pad Thai","nameOriginal":"PT","price":120,"reason":"classic","quantity":1}]}]';
    const result = parseJsonBlock(truncated);
    // L2 repair should close the final brace
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
  });

  it('F06-AC12: JSON with trailing comma (common LLM artifact) → L2 repairs', () => {
    const withTrailingComma = '{"version":1,"totalEstimate":200,"currency":"USD","rationale":"ok","diners":1,"courses":[{"name":"Main","items":[{"dishId":"d1","name":"A","nameOriginal":"A","price":10,"reason":"","quantity":1,}],}],}';
    const result = parseJsonBlock(withTrailingComma);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
  });
});

describe('extractJsonBlock — error recovery', () => {
  it('completely invalid structure (XML) → null', () => {
    expect(extractJsonBlock('<root><item>hello</item></root>')).toBeNull();
  });

  it('JSON with embedded newlines and special chars → correct parse', () => {
    const text = '```json\n{"version":1,"rationale":"line1\\nline2","courses":[{"name":"Main","items":[{"dishId":"d1","name":"Tëst \\"Dish\\"","nameOriginal":"T","price":10,"reason":"","quantity":1}]}],"totalEstimate":10,"currency":"THB","diners":1}\n```';
    const json = extractJsonBlock(text);
    expect(json).not.toBeNull();
    const result = parseJsonBlock(json!);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
  });

  it('very long JSON (>10KB) → correct parse', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({
      dishId: `d${i}`, name: `Dish ${i} ${'x'.repeat(80)}`, nameOriginal: 'T', price: 10, reason: 'ok', quantity: 1,
    }));
    const obj = { version: 1, totalEstimate: 1000, currency: 'THB', rationale: 'test', courses: [{ name: 'Main', items }], diners: 2 };
    const jsonStr = JSON.stringify(obj);
    expect(jsonStr.length).toBeGreaterThan(10000);
    const text = `Here:\n\`\`\`json\n${jsonStr}\n\`\`\``;
    const extracted = extractJsonBlock(text);
    expect(extracted).not.toBeNull();
    const result = parseJsonBlock(extracted!);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('mealPlan');
  });

  it('code block marker case-insensitive: ```JSON → extraction succeeds', () => {
    // Current implementation is case-sensitive on ```json
    // This test documents that ```JSON won't work with current code
    // If this is a requirement, extractJsonBlock needs updating
    const text = 'Result:\n```JSON\n{"version":1,"totalEstimate":100,"currency":"USD","rationale":"ok","courses":[{"name":"A","items":[{"dishId":"d1","name":"X","nameOriginal":"X","price":10,"reason":"","quantity":1}]}],"diners":1}\n```';
    const extracted = extractJsonBlock(text);
    // Current impl is case-sensitive, so this returns null
    // We'll make extractJsonBlock case-insensitive
    expect(extracted).not.toBeNull();
  });
});
