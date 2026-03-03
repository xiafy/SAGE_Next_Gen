/**
 * BUG-H: Tests for AI JSON response parsing robustness.
 *
 * Covers:
 * - ```json {...} ``` wrapped chat responses (message/quickReplies/recommendations)
 * - ```json\n...\n``` format with newlines
 * - Bare JSON without code block wrapper
 * - JSON.parse failure fallback to plain text
 * - MealPlan / OrderAction pass-through (covered by streamJsonParser.test.ts)
 */
import { describe, it, expect } from 'vitest';
import { extractJsonBlock, parseJsonBlock } from '../streamJsonParser';

/** Simulates the key parsing logic from AgentChatView.processAIResponse */
function processAIResponseText(fullText: string): {
  displayText: string;
  quickReplies: string[];
  isMealPlan: boolean;
  isOrderAction: boolean;
  isFallback: boolean;
} {
  let displayText = fullText;
  let quickReplies: string[] = [];
  let isMealPlan = false;
  let isOrderAction = false;
  let isFallback = false;

  const jsonStr = extractJsonBlock(fullText);
  if (jsonStr) {
    const parsed = parseJsonBlock(jsonStr);
    if (parsed) {
      displayText = fullText.replace(/```json\s*[\s\S]*?```/g, '').trim();
      if (parsed.type === 'mealPlan') isMealPlan = true;
      if (parsed.type === 'orderAction') isOrderAction = true;
    } else {
      // Not mealPlan/orderAction — try parsing as regular chat response
      try {
        const obj = JSON.parse(jsonStr) as Record<string, unknown>;
        if (typeof obj['message'] === 'string') {
          displayText = obj['message'];
        }
        if (Array.isArray(obj['quickReplies'])) {
          quickReplies = obj['quickReplies'] as string[];
        }
      } catch {
        // L3 fallback
        displayText = fullText.replace(/```json\s*[\s\S]*?```/g, '').trim() || fullText;
        isFallback = true;
      }
    }
  } else {
    // No JSON block — try full text parse
    try {
      let jsonContent = fullText;
      try {
        JSON.parse(jsonContent);
      } catch {
        const codeBlockMatch = fullText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch?.[1]) {
          jsonContent = codeBlockMatch[1];
        } else {
          throw new Error('no json found');
        }
      }
      const obj = JSON.parse(jsonContent) as Record<string, unknown>;
      if (typeof obj['message'] === 'string') {
        displayText = obj['message'];
      }
      if (Array.isArray(obj['quickReplies'])) {
        quickReplies = obj['quickReplies'] as string[];
      }
    } catch {
      // plain text
    }
  }

  return { displayText, quickReplies, isMealPlan, isOrderAction, isFallback };
}

describe('BUG-H: processAIResponse JSON parsing robustness', () => {
  it('parses ```json\\n{...}\\n``` wrapped chat response', () => {
    const text = '```json\n{"message":"推荐你试试冬阴功汤","quickReplies":["好的","换一道"]}\n```';
    const result = processAIResponseText(text);
    expect(result.displayText).toBe('推荐你试试冬阴功汤');
    expect(result.quickReplies).toEqual(['好的', '换一道']);
    expect(result.isMealPlan).toBe(false);
  });

  it('parses ```json{...}``` without newline after marker', () => {
    const text = '```json{"message":"Try the Tom Yum","quickReplies":["Sure","Next"]}\n```';
    const result = processAIResponseText(text);
    expect(result.displayText).toBe('Try the Tom Yum');
    expect(result.quickReplies).toEqual(['Sure', 'Next']);
  });

  it('parses bare JSON without code block', () => {
    const text = '{"message":"这道菜不错","quickReplies":["加入","继续看"]}';
    const result = processAIResponseText(text);
    expect(result.displayText).toBe('这道菜不错');
    expect(result.quickReplies).toEqual(['加入', '继续看']);
  });

  it('falls back to plain text for non-JSON content', () => {
    const text = '今天推荐你试试冬阴功汤，酸辣开胃很好喝！';
    const result = processAIResponseText(text);
    expect(result.displayText).toBe(text);
    expect(result.quickReplies).toEqual([]);
  });

  it('handles text + JSON code block mix (MealPlan)', () => {
    const mp = JSON.stringify({
      version: 1,
      totalEstimate: 500,
      currency: 'THB',
      rationale: 'balanced',
      courses: [{ name: 'Main', items: [{ dishId: 'd1', name: 'Tom Yum', nameOriginal: 'ต้มยำ', price: 200, reason: 'good', quantity: 1 }] }],
      diners: 2,
    });
    const text = `为你搭配了一套方案：\n\`\`\`json\n${mp}\n\`\`\``;
    const result = processAIResponseText(text);
    expect(result.isMealPlan).toBe(true);
  });

  it('handles malformed JSON in code block → L3 fallback', () => {
    const text = '```json\n{broken json here\n```';
    const result = processAIResponseText(text);
    expect(result.isFallback).toBe(true);
  });

  it('extracts message from JSON with recommendations', () => {
    const text = '```json\n{"message":"推荐三道菜","recommendations":[{"itemId":"d1","reason":"好吃"}],"quickReplies":["加入"]}\n```';
    const result = processAIResponseText(text);
    expect(result.displayText).toBe('推荐三道菜');
    expect(result.quickReplies).toEqual(['加入']);
  });
});
