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
});
