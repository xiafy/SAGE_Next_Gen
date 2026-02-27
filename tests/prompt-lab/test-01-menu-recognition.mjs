/**
 * Phase 0 · Task 1: 菜单识别质量验证
 * 模型: qwen3-vl-plus
 * 图片: 本地生成的测试菜单（base64 传入）
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dir = path.dirname(fileURLToPath(import.meta.url));
const API_KEY = process.env.BAILIAN_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3-vl-plus';

const TEST_MENUS = [
  { name: 'T1 · 日文居酒屋', file: 'test-images/menu_ja_izakaya.jpg',    lang: 'zh', expectedLang: 'ja' },
  { name: 'T2 · 中文餐厅',   file: 'test-images/menu_zh_restaurant.jpg', lang: 'zh', expectedLang: 'zh' },
];

const SYSTEM_PROMPT = `你是 SAGE，一个专业的全球餐饮智能体，擅长识别世界各地餐厅菜单。

## 任务
分析用户提供的菜单图片，输出严格的 JSON 数据。不要输出任何 markdown 代码块或解释文字。

## 输出规则
- 纯 JSON，无任何包装
- id 字段：8位字母数字，全局唯一
- nameOriginal：菜单原文字符
- nameTranslated：翻译成用户语言
- price：数值，priceText：含货币符号原文
- tags 只从以下选择：spicy, vegetarian, vegan, gluten_free, contains_nuts, contains_seafood, contains_pork, contains_alcohol, popular, signature
- 不输出 agentRole 或 agentGreeting

## 输出格式
{
  "menuType": "restaurant|bar|dessert|fastfood|cafe|other",
  "detectedLanguage": "ISO 639-1，如 ja/zh/en",
  "priceLevel": 1|2|3,
  "currency": "JPY（可选）",
  "categories": [{"id":"","nameOriginal":"","nameTranslated":"","itemIds":[]}],
  "items": [{"id":"","nameOriginal":"","nameTranslated":"","descriptionTranslated":"","price":0,"priceText":"","tags":[]}],
  "processingMs": 0,
  "imageCount": 1
}`;

function toBase64(filePath) {
  const full = path.join(__dir, filePath);
  return fs.readFileSync(full).toString('base64');
}

async function testMenu(menu) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`🔍 ${menu.name}  (${menu.file})`);

  const b64 = toBase64(menu.file);
  const startMs = Date.now();

  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${b64}` } },
          { type: 'text', text: `请识别这份菜单，输出JSON。\n用户语言：${menu.lang}\n时间：${new Date().toLocaleTimeString('zh-CN')}` },
        ],
      },
    ],
    response_format: { type: 'json_object' },
  };

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });

    const elapsedMs = Date.now() - startMs;

    if (!res.ok) {
      console.error(`❌ API ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    let parsed;
    try { parsed = JSON.parse(content); }
    catch { console.error('❌ JSON 解析失败:', content?.slice(0, 300)); return null; }

    // ── 输出结果 ──────────────────────────────────────────────────
    console.log(`✅ ${elapsedMs}ms | menuType:${parsed.menuType} | lang:${parsed.detectedLanguage} | priceLevel:${parsed.priceLevel}`);
    console.log(`   categories:${parsed.categories?.length} | items:${parsed.items?.length}`);
    console.log(`   token: in=${data.usage?.prompt_tokens} out=${data.usage?.completion_tokens}`);

    // 前5道菜
    console.log('\n  前5道菜:');
    (parsed.items ?? []).slice(0, 5).forEach((item, i) => {
      const priceStr = item.priceText ? ` ${item.priceText}` : '';
      const tagsStr  = item.tags?.length ? ` [${item.tags.join(',')}]` : '';
      console.log(`  ${i+1}. ${item.nameOriginal} → ${item.nameTranslated}${priceStr}${tagsStr}`);
    });

    // ── 评分 ──────────────────────────────────────────────────────
    const issues = [];
    if (!parsed.menuType)           issues.push('缺 menuType');
    if (!parsed.detectedLanguage)   issues.push('缺 detectedLanguage');
    if (parsed.detectedLanguage && parsed.detectedLanguage !== menu.expectedLang)
                                    issues.push(`语言识别偏差：期望 ${menu.expectedLang}，实际 ${parsed.detectedLanguage}`);
    if (!parsed.items?.length)      issues.push('items 为空');
    if (parsed.agentGreeting)       issues.push('不应有 agentGreeting（DEC-020）');
    if (parsed.agentRole)           issues.push('不应有 agentRole（DEC-020）');

    const ids = (parsed.items ?? []).map(i => i.id);
    const dupId = ids.find((id, idx) => ids.indexOf(id) !== idx);
    if (dupId) issues.push(`id 重复: ${dupId}`);

    const missingOrig = (parsed.items ?? []).filter(i => !i.nameOriginal).length;
    if (missingOrig) issues.push(`${missingOrig} 道菜缺 nameOriginal`);

    if (issues.length === 0) {
      console.log('\n  ✅ Schema 全部通过');
    } else {
      console.log(`\n  ⚠️  问题 (${issues.length}):`);
      issues.forEach(i => console.log(`     - ${i}`));
    }

    return { ok: issues.length === 0, elapsedMs, itemCount: parsed.items?.length ?? 0 };

  } catch (err) {
    console.error(`❌ 异常: ${err.message}`);
    return null;
  }
}

if (!API_KEY) { console.error('请设置 BAILIAN_API_KEY'); process.exit(1); }

console.log('🧪 Task 1: 菜单识别测试  模型:', MODEL);
console.log('='.repeat(60));

const results = [];
for (const menu of TEST_MENUS) {
  const r = await testMenu(menu);
  results.push(r);
}

console.log('\n\n' + '='.repeat(60));
const passed = results.filter(r => r?.ok).length;
console.log(`📊 通过: ${passed}/${results.length}  平均耗时: ${Math.round(results.filter(Boolean).reduce((a,r)=>a+r.elapsedMs,0)/results.filter(Boolean).length)}ms`);
console.log(passed === results.length ? '🎉 Task 1 PASS' : '⚠️  Task 1 需要调整 Prompt');
