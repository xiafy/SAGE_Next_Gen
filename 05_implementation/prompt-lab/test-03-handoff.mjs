/**
 * Phase 0 · Task 3: Handoff + 主 Chat 验证
 * 
 * 测试：Pre-Chat 结束 → 识别完成 → 主 Chat 接管
 * 成功标准：
 * - 主 Chat 首条消息不重复问已回答问题
 * - 直接基于菜单给出个性化推荐
 * - recommendations 的 itemId 真实存在于菜单
 * - ≤3 轮完成点餐决策
 */

const API_KEY = process.env.BAILIAN_API_KEY;
const BASE_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1';
const MODEL = 'qwen3.5-plus';

// ── Mock 菜单数据（模拟 /api/analyze 返回）──────────────────────────────
const MOCK_MENU = {
  menuType: 'restaurant',
  detectedLanguage: 'ja',
  priceLevel: 2,
  currency: 'JPY',
  categories: [
    { id: 'cat001ab', nameOriginal: '前菜', nameTranslated: '前菜/小食', itemIds: ['item001a', 'item002b'] },
    { id: 'cat002cd', nameOriginal: '刺身', nameTranslated: '刺身/生鱼片', itemIds: ['item003c', 'item004d'] },
    { id: 'cat003ef', nameOriginal: '焼き物', nameTranslated: '烤物', itemIds: ['item005e', 'item006f'] },
    { id: 'cat004gh', nameOriginal: '揚げ物', nameTranslated: '炸物', itemIds: ['item007g', 'item008h'] },
    { id: 'cat005ij', nameOriginal: 'ご飯もの', nameTranslated: '主食', itemIds: ['item009i', 'item010j'] },
  ],
  items: [
    { id: 'item001a', nameOriginal: '枝豆', nameTranslated: '毛豆', price: 380, priceText: '¥380', tags: ['vegetarian', 'popular'] },
    { id: 'item002b', nameOriginal: 'だし巻き玉子', nameTranslated: '日式玉子烧', price: 480, priceText: '¥480', tags: ['popular', 'signature'] },
    { id: 'item003c', nameOriginal: 'まぐろ刺身', nameTranslated: '金枪鱼刺身', price: 980, priceText: '¥980', tags: ['contains_seafood', 'popular'] },
    { id: 'item004d', nameOriginal: 'サーモン刺身', nameTranslated: '三文鱼刺身', price: 880, priceText: '¥880', tags: ['contains_seafood'] },
    { id: 'item005e', nameOriginal: '焼き鳥盛り合わせ', nameTranslated: '烤串拼盘', price: 1200, priceText: '¥1,200', tags: ['popular', 'signature'] },
    { id: 'item006f', nameOriginal: '塩サバ焼き', nameTranslated: '盐烤鲭鱼', price: 780, priceText: '¥780', tags: ['contains_seafood'] },
    { id: 'item007g', nameOriginal: '唐揚げ', nameTranslated: '日式炸鸡', price: 680, priceText: '¥680', tags: ['popular'] },
    { id: 'item008h', nameOriginal: 'アジフライ', nameTranslated: '炸竹荚鱼', price: 580, priceText: '¥580', tags: ['contains_seafood'] },
    { id: 'item009i', nameOriginal: '鮭茶漬け', nameTranslated: '鲑鱼茶泡饭', price: 680, priceText: '¥680', tags: ['contains_seafood'] },
    { id: 'item010j', nameOriginal: '焼きおにぎり', nameTranslated: '烤饭团', price: 320, priceText: '¥320', tags: ['vegetarian', 'popular'] },
  ],
  processingMs: 8420,
  imageCount: 1,
};

const MAIN_CHAT_SYSTEM = (menuData, preferences, context) => `你是 SAGE，一个专为旅行者设计的餐饮智能体。

## 当前场景
- 时间：${context.time}（${context.mealType}）
- 位置：${context.location ?? '未知'}
- 用户语言：${context.language}
- 用户偏好：${buildPreferenceSummary(preferences)}

## 菜单（${menuData.menuType}，价格档次：${menuData.priceLevel}/3，${menuData.detectedLanguage}）
${buildMenuSummary(menuData)}

## 回复规则
- 使用${context.language === 'zh' ? '中文' : 'English'}回复
- 每次回复不超过 3 句话
- 提供具体可操作建议，必须带原文菜名和翻译
- 生成 2-4 个 quickReplies 推进对话
- 优先规避用户的过敏/禁忌食材
- recommendations 最多 3 个，itemId 必须来自菜单数据
- 不要重复问用户在 Pre-Chat 阶段已经回答过的问题
- 输出严格 JSON，不要 markdown

## 输出格式
{
  "message": "...",
  "recommendations": [{"itemId": "...", "reason": "..."}],
  "quickReplies": ["...", "..."],
  "preferenceUpdates": [],
  "triggerExplore": false
}`;

function buildPreferenceSummary(prefs) {
  if (!prefs || (!prefs.restrictions?.length && !prefs.flavors?.length)) return '暂无';
  const parts = [];
  if (prefs.restrictions?.length) {
    parts.push('忌口：' + prefs.restrictions.map(r => r.value).join('、'));
  }
  if (prefs.flavors?.length) {
    parts.push('口味：' + prefs.flavors.map(f => `${f.action === 'add' ? '喜欢' : '不喜欢'}${f.value}`).join('、'));
  }
  return parts.join('；');
}

function buildMenuSummary(menu) {
  return menu.items.map(item =>
    `[${item.id}] ${item.nameOriginal}（${item.nameTranslated}）${item.priceText ?? ''} ${item.tags.join(',')}`,
  ).join('\n');
}

async function callMainChat(messages, menuData, preferences, context) {
  const systemContent = MAIN_CHAT_SYSTEM(menuData, preferences, context);
  const body = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemContent },
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

  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// ── 测试场景 ────────────────────────────────────────────────────────────

async function runHandoffTest(name, preChatHistory, preferences, followupTurns = []) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📝 ${name}`);
  console.log('─'.repeat(60));

  const context = {
    time: '19:30',
    mealType: '晚餐',
    location: '东京',
    language: 'zh',
  };

  // handoff 注入 system note
  const handoffNote = {
    role: 'system',
    content: `[菜单已识别完成]
菜单类型：${MOCK_MENU.menuType}，价格档次：${MOCK_MENU.priceLevel}，语言：${MOCK_MENU.detectedLanguage}
菜品数：${MOCK_MENU.items.length}
用户已告知：${buildPreferenceSummary(preferences)}
请基于以上信息，自然接续之前的对话，直接给出推荐。不要重新问已经回答过的问题。`,
  };

  const messages = [...preChatHistory, handoffNote];

  // ── 主 Chat 首条消息 ────────────────────────────────────────────────
  const startMs = Date.now();
  let response;
  try {
    response = await callMainChat(messages, MOCK_MENU, preferences, context);
  } catch (err) {
    console.error(`❌ Handoff 调用失败: ${err.message}`);
    return;
  }
  const elapsed = Date.now() - startMs;

  console.log(`\n🤝 Handoff 完成，主 Chat 接管 (${elapsed}ms)`);
  console.log(`AI: "${response.message}"`);

  if (response.recommendations?.length) {
    console.log(`\n推荐菜品:`);
    response.recommendations.forEach(r => {
      const item = MOCK_MENU.items.find(i => i.id === r.itemId);
      const valid = item ? '✅' : '❌ ID不存在';
      console.log(`  ${valid} [${r.itemId}] ${item?.nameTranslated ?? '???'} - ${r.reason}`);
    });
  }

  if (response.quickReplies?.length) {
    console.log(`\n快捷回复: [${response.quickReplies.join('] [')}]`);
  }

  // ── 检验是否重复提问 ────────────────────────────────────────────────
  const answeredQuestions = ['几位', '人数', '忌口', '过敏', '辣'];
  const repeated = answeredQuestions.filter(q => response.message.includes(q));
  if (repeated.length > 0) {
    console.log(`\n⚠️  重复提问检测：AI 可能重问了已回答的问题 (${repeated.join(', ')})`);
  } else {
    console.log(`\n✅ 未重复提问`);
  }

  // ── 继续对话轮次 ────────────────────────────────────────────────────
  if (followupTurns.length > 0) {
    messages.push({ role: 'assistant', content: response.message });

    for (const [i, userInput] of followupTurns.entries()) {
      messages.push({ role: 'user', content: userInput });
      console.log(`\n用户(第${i+2}轮): "${userInput}"`);

      const r = await callMainChat(messages, MOCK_MENU, preferences, context);
      console.log(`AI: "${r.message}"`);
      if (r.recommendations?.length) {
        console.log(`推荐: ${r.recommendations.map(rec => {
          const item = MOCK_MENU.items.find(i => i.id === rec.itemId);
          return item?.nameTranslated ?? rec.itemId;
        }).join(', ')}`);
      }
      messages.push({ role: 'assistant', content: r.message });
    }

    console.log(`\n📊 总轮数: ${followupTurns.length + 1} 轮（目标 ≤3）${followupTurns.length + 1 <= 3 ? ' ✅' : ' ⚠️ 超出'}`);
  }
}

// ── 主流程 ─────────────────────────────────────────────────────────────

if (!API_KEY) {
  console.error('❌ 请设置环境变量 BAILIAN_API_KEY');
  process.exit(1);
}

console.log('🧪 SAGE Prompt Lab · Task 3: Handoff + 主 Chat 测试');
console.log(`模型: ${MODEL}`);
console.log('='.repeat(60));

// 测试 A：Pre-Chat 有 3 轮对话后交接
await runHandoffTest(
  'Test A: 充分 Pre-Chat 后交接（1人，不辣，花生过敏，探索特色）',
  [
    { role: 'assistant', content: '菜单识别中～你们几位用餐？' },
    { role: 'user', content: '就我一个人' },
    { role: 'assistant', content: '一个人探店，正好可以点几道精选！有什么不吃的吗？' },
    { role: 'user', content: '不吃辣，花生过敏' },
    { role: 'assistant', content: '记下了～想探索一下本地特色，还是点比较保险的？' },
    { role: 'user', content: '探索一下' },
  ],
  {
    restrictions: [
      { type: 'dislike', value: '辣' },
      { type: 'allergy', value: '花生' },
    ],
    flavors: [],
  },
  ['两道都要，还有别的推荐吗？'],
);

// 测试 B：Pre-Chat 无回复（用户没说话）
await runHandoffTest(
  'Test B: 无 Pre-Chat 对话直接交接（2人，无偏好）',
  [
    { role: 'assistant', content: '菜单识别中～先聊两句，你们几位用餐？' },
  ],
  { restrictions: [], flavors: [] },
  ['随便推荐几道吧'],
);

console.log('\n\n' + '='.repeat(60));
console.log('Task 3 完成');
