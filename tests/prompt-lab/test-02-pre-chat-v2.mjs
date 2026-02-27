/**
 * Phase 0 · Task 2 v2: Pre-Chat Prompt 修复版
 * 
 * 修复：
 * P0 - 去掉 response_format，改为 Prompt 内约束
 * P0 - 重写 Prompt，强调"读取用户输入"
 * P1 - 每轮必须提炼偏好
 */

const API_KEY = process.env.BAILIAN_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3.5-flash';

// ── v2 Pre-Chat Prompt（重写）─────────────────────────────────────────
const PRE_CHAT_SYSTEM_V2 = `你是 SAGE，一个餐饮 AI 助手。菜单图片正在识别中。

## 你现在的任务
趁等待的时间，和用户快速聊几句，了解他们的用餐情况。

## 核心规则（必须严格遵守）
1. **先读用户说了什么，再决定问什么。** 用户已经回答过的信息，绝对不要再问。
2. 每次只问一个简短的问题。
3. 回复不超过 2 句话，简洁、温暖、自然。
4. 不要承诺推荐（你还没看到菜单）。
5. 不要用过多 emoji，最多 1 个。
6. 用户如果一次性给了很多信息，确认收到即可，不要再追问已知内容。

## 你需要了解的信息（按优先级）
- 用餐人数
- 忌口/过敏
- 口味偏好（辣度、清淡/重口）
- 心情/场景（探索/保守）

## 偏好提炼
每次回复时，从用户已说的话中提取偏好。哪怕用户说得模糊（如"便宜点"），也要提炼。

## 输出
严格输出以下 JSON，不要任何其他文字：
{"message":"你的回复","quickReplies":["选项1","选项2"],"preferenceUpdates":[{"type":"restriction或flavor","action":"add","value":"具体内容","strength":1到3}]}

如果没有新偏好可提取，preferenceUpdates 为空数组。`;

async function callPreChat(messages) {
  const startMs = Date.now();
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: PRE_CHAT_SYSTEM_V2 },
      ...messages,
    ],
    // 不使用 response_format，靠 Prompt 约束 JSON
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const elapsed = Date.now() - startMs;
  const raw = data.choices[0].message.content;

  // 尝试从 AI 回复中提取 JSON（可能包裹在 markdown 代码块中）
  let parsed;
  try {
    // 尝试直接解析
    parsed = JSON.parse(raw);
  } catch {
    // 尝试从 ```json ... ``` 中提取
    const match = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match) {
      parsed = JSON.parse(match[1]);
    } else {
      // 尝试找到第一个 { 和最后一个 }
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        parsed = JSON.parse(raw.slice(start, end + 1));
      } else {
        console.error('❌ 无法解析 JSON:', raw.slice(0, 200));
        return { message: raw, quickReplies: [], preferenceUpdates: [], _raw: true, _elapsed: elapsed };
      }
    }
  }

  parsed._elapsed = elapsed;
  return parsed;
}

async function runScenario(name, userTurns) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📝 ${name}`);

  const messages = [];
  const allPrefs = [];
  let allOk = true;

  for (const [i, userInput] of userTurns.entries()) {
    // 先让 AI 说话（对用户的上一条回复作出反应）
    // 第一轮：Icebreaker 是本地生成的，所以我们先放入 assistant 消息
    if (i === 0) {
      const icebreaker = '菜单识别中～你们今天几位用餐？';
      messages.push({ role: 'assistant', content: icebreaker });
      console.log(`\nAI(本地): "${icebreaker}"`);
    }

    // 用户说话
    messages.push({ role: 'user', content: userInput });
    console.log(`用户: "${userInput}"`);

    // AI 回复
    const r = await callPreChat(messages);
    const speed = r._elapsed < 3000 ? '🟢' : r._elapsed < 8000 ? '🟡' : '🔴';
    console.log(`AI (${r._elapsed}ms ${speed}): "${r.message}"`);

    if (r.quickReplies?.length) {
      console.log(`  [${r.quickReplies.join('] [')}]`);
    }
    if (r.preferenceUpdates?.length) {
      console.log(`  📌 提炼: ${r.preferenceUpdates.map(p => `${p.action} "${p.value}"`).join(', ')}`);
      allPrefs.push(...r.preferenceUpdates);
    }

    // 检查：AI 是否在用户说了"不吃辣"后还问辣相关
    if (userInput.includes('不吃辣') || userInput.includes('不辣')) {
      if (r.message.includes('辣') && !r.message.includes('不辣') && !r.message.includes('辣的不')) {
        console.log(`  ⚠️  检测到矛盾：用户说不吃辣但 AI 提到了辣`);
        allOk = false;
      }
    }

    messages.push({ role: 'assistant', content: r.message });
  }

  console.log(`\n偏好汇总 (${allPrefs.length} 条): ${allPrefs.map(p => `[${p.value}]`).join(' ')}`);
  return allOk;
}

// ── 主流程 ─────────────────────────────────────────────────────────────

if (!API_KEY) { console.error('请设置 BAILIAN_API_KEY'); process.exit(1); }

console.log('🧪 Task 2 v2: Pre-Chat 修复版');
console.log(`模型: ${MODEL}  (无 response_format)`);
console.log('='.repeat(60));

const results = [];

results.push(await runScenario('A: 逐步配合', [
  '就我一个人',
  '不吃辣，花生过敏',
  '想探索一下本地特色',
]));

results.push(await runScenario('B: 简短回答', [
  '2个人',
  '都行',
  '便宜点的',
]));

results.push(await runScenario('C: 一次性给全部信息', [
  '我一个人吃，不吃辣，对贝类过敏，想吃点清淡的，预算不高',
]));

const passed = results.filter(Boolean).length;
console.log(`\n${'='.repeat(60)}`);
console.log(`📊 ${passed}/${results.length} 场景无矛盾`);
console.log(passed === results.length ? '🎉 Task 2 v2 PASS' : '⚠️ 仍有问题需调整');
