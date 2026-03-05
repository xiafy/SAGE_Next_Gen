import type { SummarizeRequest } from '../schemas/memorySchema.js';

export function buildMemorySummarizePrompt(req: SummarizeRequest): string {
  const { messages, preferences, menuData } = req;

  const conversationText = messages
    .map(m => `[${m.role}]: ${m.content}`)
    .join('\n');

  const prefLines: string[] = [];
  if (preferences.allergies.length) {
    prefLines.push(`过敏原: ${preferences.allergies.join(', ')}`);
  }
  if (preferences.restrictions.length) {
    prefLines.push(`饮食限制: ${preferences.restrictions.map(r => `${r.type}:${r.value}`).join(', ')}`);
  }
  if (preferences.flavors.length) {
    prefLines.push(`口味偏好: ${preferences.flavors.map(f => `${f.type}:${f.value}(${f.strength})`).join(', ')}`);
  }
  prefLines.push(`辣度: ${preferences.spicyLevel}`);
  if (preferences.learned.length) {
    prefLines.push(`AI已学习偏好: ${preferences.learned.map(l => `${l.value}(${l.source},${l.confidence})`).join(', ')}`);
  }

  const restaurantContext = menuData?.restaurantType
    ? `餐厅类型: ${menuData.restaurantType}`
    : '';

  return `你是一个会话摘要分析器。从下面的用户-AI对话记录中提取结构化摘要和偏好进化建议。

## 当前用户偏好基准
${prefLines.join('\n')}
${restaurantContext}

## 对话记录
${conversationText}

## 输出要求

请严格输出以下JSON格式（不要输出任何其他内容）：

{
  "summary": {
    "dishesOrdered": ["用户最终确认要点的菜名列表"],
    "dishesSkipped": ["用户明确拒绝或跳过的菜名列表"],
    "restaurantType": "餐厅类型（泰式/日料/意大利等，从对话推断）",
    "preferencesLearned": ["人类可读的偏好发现，如：喜欢海鲜、不吃猪肉"],
    "keyMoments": ["关键决策摘要，最多3句，如：用户因过敏拒绝了含花生的菜"]
  },
  "evolutions": [
    {
      "action": "add|strengthen|modify",
      "key": "偏好标识（如 seafood, no_pork, mild_spicy）",
      "entry": {
        "value": "偏好值",
        "source": "explicit|inferred",
        "confidence": 0.3,
        "firstSeen": "${new Date().toISOString().slice(0, 10)}",
        "lastSeen": "${new Date().toISOString().slice(0, 10)}",
        "occurrences": 1
      },
      "newConfidence": null,
      "oldValue": null,
      "newValue": null
    }
  ]
}

## 偏好进化规则

### action 类型说明
- **add**: 新发现的偏好（当前基准learned[]中没有）
  - 用户明确说出的 → source="explicit", confidence=1.0
  - 从行为推断的（如总是跳过某类菜）→ source="inferred", confidence=0.3
- **strengthen**: 重复确认已有偏好（基准learned[]中已有，且本次再次出现）
  - 不需要entry字段，只需key
  - newConfidence = 当前confidence + 0.2（上限1.0）
- **modify**: 与基准矛盾的显式信号（如之前说不吃辣，这次说中辣可以）
  - 需要oldValue和newValue
  - explicit信号覆盖inferred信号

### 注意
- weaken（衰减）由前端根据历史判断，AI不输出weaken
- 如果没有偏好变化，evolutions返回空数组[]
- dishesOrdered/dishesSkipped 如果对话中没有明确点菜行为，返回空数组
- keyMoments 最多3条，概括关键决策
- 所有字段必须存在，可选字段用null表示`;
}
