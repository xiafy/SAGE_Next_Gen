import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd(), '..', '..');
const menuPromptPath = path.join(root, 'worker/prompts/menuAnalysis.ts');
const preChatPromptPath = path.join(root, 'worker/prompts/preChat.ts');

function assertContains(content, needle, label) {
  if (!content.includes(needle)) {
    throw new Error(`Missing: ${label}`);
  }
  console.log(`✅ ${label}`);
}

function run() {
  const menu = fs.readFileSync(menuPromptPath, 'utf-8');
  const pre = fs.readFileSync(preChatPromptPath, 'utf-8');

  console.log('Running prompt regression checks...');

  // KI-001: seafood false-positive guardrail
  assertContains(menu, 'contains_seafood 仅在菜名/描述明确出现鱼/虾/蟹/贝/海鲜等食材时添加', 'menu seafood strict rule');
  assertContains(menu, '不要因为“海椒/海量/海派”等字样误判为海鲜', 'menu seafood false-positive examples');

  // KI-002: budget preference normalization
  assertContains(pre, '预算友好', 'zh budget normalization');
  assertContains(pre, 'budget_friendly', 'en budget normalization');
  assertContains(pre, 'Avoid weak/incomplete values like just "low".', 'en avoid weak value');

  console.log('\n🎉 Prompt regression checks passed.');
}

run();
