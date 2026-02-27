/**
 * Phase 0 · Task 2: Pre-Chat Prompt 验证
 * 
 * 测试 qwen3.5-flash 在 ANALYZING 阶段是否能自然引导用户
 * 成功标准：
 * - 每轮只问一件事
 * - 对话自然，不像问卷
 * - 正确提炼 preferenceUpdates
 */

const API_KEY = process.env.BAILIAN_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3.5-flash';

const PRE_CHAT_SYSTEM_PROMPT = `你是 SAGE，正在帮用户准备点餐。

当前状态：菜单图片识别中（约需几秒）。你还没有看到菜单内容。

你的任务：
在等待期间，主动、自然地和用户聊起来，了解：
  - 用餐人数和场景（一个人？朋友聚餐？商务？）
  - 有什么忌口或过敏原
  - 今天的心情和偏好（想吃清淡还是重口？探索新奇还是稳妥？）
  - 预算大致范围（如果自然引出）

原则：
  - 像朋友一样聊，不要像问卷调查
  - 每次只问一个问题，不要一次列举多个
  - 不要承诺推荐（你还没有看到菜单）
  - 轻松自然，可以适当加一点幽默或期待感

输出格式（严格 JSON）：
{
  "message": "你的回复文字",
  "quickReplies": ["选项1", "选项2"],
  "preferenceUpdates": [
    {
      "type": "restriction|flavor",
      "action": "add|remove",
      "value": "具体内容",
      "strength": 1|2|3
    }
  ]
}`;

async function callPreChat(messages, language = 'zh') {
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: PRE_CHAT_SYSTEM_PROMPT },
      ...messages,
    ],
    response_format: { type: 'json_object' },
  };

  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45_000),
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ── 模拟对话场景 ────────────────────────────────────────────────────────

async function runScenario(name, userTurns) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📝 场景: ${name}`);
  console.log('─'.repeat(60));

  const messages = [];
  const allPreferenceUpdates = [];

  for (const [i, userInput] of userTurns.entries()) {
    const startMs = Date.now();
    let aiResponse;

    try {
      aiResponse = await callPreChat(messages);
    } catch (err) {
      console.error(`❌ 第${i+1}轮 AI 错误: ${err.message}`);
      break;
    }

    const elapsed = Date.now() - startMs;

    if (i === 0) {
      // 第一轮：AI 先说话（Icebreaker）
      console.log(`\nAI 第1条（本地生成模拟）:  "菜单识别中，先聊两句～"`);
    }

    // 用户说话
    messages.push({ role: 'user', content: userInput });
    console.log(`\n用户: "${userInput}"`);

    // AI 响应
    const aiMsg = aiResponse.message;
    console.log(`AI (${elapsed}ms): "${aiMsg}"`);

    if (aiResponse.quickReplies?.length) {
      console.log(`  快捷回复: [${aiResponse.quickReplies.join('] [')}]`);
    }

    if (aiResponse.preferenceUpdates?.length) {
      console.log(`  📌 提炼偏好: ${JSON.stringify(aiResponse.preferenceUpdates)}`);
      allPreferenceUpdates.push(...aiResponse.preferenceUpdates);
    }

    messages.push({ role: 'assistant', content: aiMsg });
  }

  console.log(`\n📊 本场景提炼到的偏好 (共 ${allPreferenceUpdates.length} 条):`);
  if (allPreferenceUpdates.length > 0) {
    allPreferenceUpdates.forEach(p => {
      console.log(`   ${p.action} [${p.type}] "${p.value}" (强度:${p.strength ?? '-'})`);
    });
  } else {
    console.log('   (无)');
  }
}

// ── 主流程 ─────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error('❌ 请设置环境变量 BAILIAN_API_KEY');
  process.exit(1);
}

console.log('🧪 SAGE Prompt Lab · Task 2: Pre-Chat 测试');
console.log(`模型: ${MODEL}`);
console.log('='.repeat(60));

// 场景 A：用户主动配合（理想情况）
await runScenario('场景A: 用户主动配合', [
  '就我一个人',
  '不吃辣，花生过敏',
  '想探索一下本地特色',
]);

// 场景 B：用户简短回答
await runScenario('场景B: 用户简短', [
  '2个人',
  '都行',
  '便宜点的',
]);

// 场景 C：用户主动说出很多信息
await runScenario('场景C: 用户主动说很多', [
  '我一个人吃，不吃辣，对贝类过敏，想吃点清淡的，预算不高',
]);

console.log('\n\n' + '='.repeat(60));
console.log('Task 2 完成');
