/**
 * Phase 0 · Task 4: Streaming 速度测试
 *
 * 测量指标：
 *   TTFT  - Time to First Token（用户感知延迟，越低越好）
 *   Total - 完整响应时间
 *
 * 同时测试 Pre-Chat（qwen3.5-flash）和主 Chat（qwen3.5-plus）
 */

const API_KEY   = process.env.BAILIAN_API_KEY;
const BASE_URL  = 'https://dashscope.aliyuncs.com/compatible-mode/v1';

// ── SSE 流式调用 ────────────────────────────────────────────────────────
async function streamChat({ model, messages, onToken, onDone }) {
  const startMs   = Date.now();
  let firstTokenMs = null;
  let fullText    = '';

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method : 'POST',
    headers: {
      'Content-Type' : 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model, messages, stream: true }),
    signal: AbortSignal.timeout(60_000),
  });

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  let   buf     = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';               // 保留可能不完整的最后一行

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const chunk  = JSON.parse(data);
        const delta  = chunk.choices?.[0]?.delta?.content ?? '';
        if (!delta) continue;

        if (firstTokenMs === null) {
          firstTokenMs = Date.now() - startMs;
          process.stdout.write('\n  ');
        }

        process.stdout.write(delta);
        fullText += delta;
        onToken?.(delta);
      } catch { /* 忽略非 JSON 行 */ }
    }
  }

  const totalMs = Date.now() - startMs;
  process.stdout.write('\n');
  onDone?.({ fullText, firstTokenMs, totalMs });
  return { fullText, firstTokenMs, totalMs };
}

// ── 测试用例 ────────────────────────────────────────────────────────────

const PRE_CHAT_SYSTEM = `你是 SAGE，一个餐饮 AI。菜单图片识别中。

规则：
- 先读用户说了什么，已回答的不再问
- 每次只问一个简短问题（≤2句话）
- 从用户输入提炼饮食偏好

输出严格 JSON（不要代码块）：
{"message":"回复","quickReplies":["选1","选2"],"preferenceUpdates":[{"type":"restriction或flavor","action":"add","value":"内容","strength":3}]}`;

const MAIN_CHAT_SYSTEM = `你是 SAGE 餐饮智能体。已知菜单：居酒屋，日文，中等价位，12道菜。
用户偏好：1人，不辣，花生过敏，想探索本地特色。
推荐规则：推荐2-3道菜，带中文菜名，不重复问已知信息，不在消息文本里写itemId。
JSON输出：{"message":"推荐文字","recommendations":[{"itemId":"item002b","reason":"理由"}],"quickReplies":["选1","选2"],"preferenceUpdates":[],"triggerExplore":false}`;

async function runSpeedTest(label, model, system, userMsg) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`⚡ ${label}  模型: ${model}`);
  console.log(`用户: "${userMsg}"`);
  console.log('AI 输出（流式）:');

  const { firstTokenMs, totalMs, fullText } = await streamChat({
    model,
    messages: [
      { role: 'system',    content: system  },
      { role: 'user',      content: userMsg },
    ],
  });

  // 尝试解析 JSON
  let parsed = null;
  try {
    const match = fullText.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch { /* 忽略 */ }

  const ttftIcon  = firstTokenMs < 1000 ? '🟢' : firstTokenMs < 3000 ? '🟡' : '🔴';
  const totalIcon = totalMs      < 5000 ? '🟢' : totalMs      <10000 ? '🟡' : '🔴';

  console.log(`\n  TTFT : ${firstTokenMs}ms ${ttftIcon}   Total: ${totalMs}ms ${totalIcon}`);
  if (parsed?.message) {
    console.log(`  消息 : "${parsed.message}"`);
    if (parsed.quickReplies?.length) console.log(`  快捷 : [${parsed.quickReplies.join('] [')}]`);
    if (parsed.preferenceUpdates?.length) console.log(`  偏好 : ${parsed.preferenceUpdates.map(p=>p.value).join(', ')}`);
    if (parsed.recommendations?.length)  console.log(`  推荐 : ${parsed.recommendations.map(r=>r.itemId).join(', ')}`);
    console.log('  ✅ JSON 解析成功');
  } else {
    console.log('  ⚠️  JSON 解析失败，原始输出已在上方显示');
  }

  return { firstTokenMs, totalMs, jsonOk: !!parsed?.message };
}

// ── 主流程 ─────────────────────────────────────────────────────────────

if (!API_KEY) { console.error('请设置 BAILIAN_API_KEY'); process.exit(1); }

console.log('🧪 Task 4: Streaming 速度测试');
console.log('目标 TTFT: Pre-Chat < 1.5s，主Chat < 2s');
console.log('='.repeat(60));

const results = [];

// Pre-Chat：3次调用，看 TTFT 稳定性
results.push(await runSpeedTest(
  'Pre-Chat #1', 'qwen3.5-flash', PRE_CHAT_SYSTEM,
  '就我一个人',
));
results.push(await runSpeedTest(
  'Pre-Chat #2', 'qwen3.5-flash', PRE_CHAT_SYSTEM,
  '不吃辣，花生过敏',
));
results.push(await runSpeedTest(
  'Pre-Chat #3', 'qwen3.5-flash', PRE_CHAT_SYSTEM,
  '我一个人，不辣，想探索本地特色',
));

// 主 Chat：Handoff 后的首条推荐
results.push(await runSpeedTest(
  '主Chat Handoff', 'qwen3.5-plus', MAIN_CHAT_SYSTEM,
  '菜单识别好了，给我推荐几道菜',
));

console.log('\n\n' + '='.repeat(60));
console.log('📊 汇总:');
results.forEach((r, i) => {
  const names = ['Pre-Chat #1','Pre-Chat #2','Pre-Chat #3','主Chat Handoff'];
  const t = r.firstTokenMs;
  const icon = t < 1000 ? '🟢' : t < 3000 ? '🟡' : '🔴';
  console.log(`  ${names[i]}: TTFT=${t}ms ${icon}  Total=${r.totalMs}ms  JSON=${r.jsonOk?'✅':'❌'}`);
});

const avgTTFT = Math.round(results.reduce((a,r)=>a+r.firstTokenMs, 0) / results.length);
const allJsonOk = results.every(r => r.jsonOk);
console.log(`\n平均 TTFT: ${avgTTFT}ms  JSON全部解析: ${allJsonOk ? '✅' : '❌'}`);
console.log(avgTTFT < 2000 && allJsonOk ? '🎉 Streaming PASS' : '⚠️  继续优化');
