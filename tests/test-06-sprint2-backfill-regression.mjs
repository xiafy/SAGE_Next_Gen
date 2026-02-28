import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf-8');
}

function ok(cond, label) {
  if (!cond) throw new Error(`❌ ${label}`);
  console.log(`✅ ${label}`);
}

function countMatches(text, re) {
  return (text.match(re) || []).length;
}

function checkFallback() {
  console.log('\n[Fallback]');
  const chat = read('worker/handlers/chat.ts');
  const bailian = read('worker/utils/bailian.ts');

  ok(chat.includes("const model = mode === 'pre_chat' ? 'qwen3.5-flash' : 'qwen3.5-plus';"), 'chat mode model mapping');
  ok(chat.includes("const fallback = mode === 'pre_chat' ? undefined : 'qwen3.5-flash';"), 'fallback only for chat mode');
  ok(chat.includes('streamPassthroughWithFallback'), 'chat handler uses fallback stream function');

  ok(bailian.includes('res.status === 403 || res.status >= 500'), 'fallback trigger on 403/5xx');
  ok(bailian.includes('return doStream(fallbackModel);'), 'fallback retries with fallback model');
}

function checkWeather() {
  console.log('\n[Weather]');
  const weather = read('worker/utils/weather.ts');
  const chat = read('worker/handlers/chat.ts');
  const prompt = read('worker/prompts/agentChat.ts');

  ok(weather.includes('AbortSignal.timeout(500)'), 'weather timeout 500ms');
  ok(weather.includes('Number.isFinite(lat)') && weather.includes('Number.isFinite(lng)'), 'lat/lng finite validation');
  ok(weather.includes('lat < -90 || lat > 90 || lng < -180 || lng > 180'), 'lat/lng range validation');

  ok(chat.includes('const weather = context.location') && chat.includes('await getWeather'), 'chat handler fetches weather when location exists');
  ok(prompt.includes('weather ?') && (prompt.includes('天气') || prompt.includes('Weather')), 'agent chat prompt injects weather context');
}

function checkErrorSuggestions() {
  console.log('\n[Error Suggestions]');
  const errors = read('worker/utils/errors.ts');
  const shared = read('shared/types.ts');

  ok(errors.includes('suggestion') && errors.includes('suggestionZh'), 'error meta contains suggestion fields');

  const codeCount = countMatches(errors, /^[ ]{2}[A-Z_]+:/gm);
  ok(codeCount >= 9, `error code entries >= 9 (actual: ${codeCount})`);

  const suggestionCount = countMatches(errors, /suggestion:/g);
  const suggestionZhCount = countMatches(errors, /suggestionZh:/g);
  ok(suggestionCount >= 9 && suggestionZhCount >= 9, 'all error codes include suggestion + suggestionZh');

  ok(shared.includes('suggestion?: string;') && shared.includes('suggestionZh?: string;'), 'shared ApiError includes suggestion fields');
}

function main() {
  console.log('Running Sprint2 backfill regression checks...');
  checkFallback();
  checkWeather();
  checkErrorSuggestions();
  console.log('\n🎉 test-06 passed.');
}

main();
