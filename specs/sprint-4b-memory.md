# Sprint 4b Phase 2: Memory System (DEC-067)

> 版本: v2.0
> 日期: 2026-03-05
> 状态: Approved ✅（夏总 3/5 确认）

## 决策记录

1. **偏好结构**：合并 `ChatPreferences` + `SAGE_Memory.preferences` 为统一结构
2. **自我进化**：MVP 做。跨会话偏好累积 + prompt 注入
3. **存储架构**：方案 A — localStorage 主存储 + Worker 无状态 AI 摘要
4. **会话边界**：方案 D（懒摘要）— 下次打开 App 时对上次未摘要的会话生成摘要

## 目标

跨会话记忆能力，从"工具"升级为"伙伴"。AI 越用越懂用户。

## 核心能力

### P0: 统一偏好结构 + 版本化
- 合并现有 `ChatPreferences` 和新增字段为 `UserPreferences`
- schema version + migration 机制
- localStorage key: `sage_memory_v1`

### P1: 会话摘要（懒生成）
- 会话消息实时存 localStorage（现有 + sessionId 标记）
- 下次打开 App 时检测未摘要的旧会话 → 调 Worker 生成摘要 → 存入 `sessions[]`
- 会话边界：新扫描 / 超过 2 小时 / Home 选"新的" = 新会话

### P2: 跨会话记忆注入（自我进化）
- 新会话 prompt 注入历史摘要 + 偏好
- "上次你在曼谷点了冬阴功，说中辣刚好"
- 最近 5 次会话摘要，按相关性排序（餐厅类型匹配优先）

## 技术设计

### 统一类型（shared/types.ts）

```typescript
// 合并 ChatPreferences → UserPreferences
export interface UserPreferences {
  restrictions: Restriction[];        // 现有：饮食限制
  allergies: string[];                // 新增：过敏原（独立于 restrictions）
  flavors: FlavorPreference[];        // 现有：口味偏好
  spicyLevel: 'none' | 'mild' | 'medium' | 'hot';  // 新增
  language: 'zh' | 'en';             // 现有
  history: DiningHistory[];           // 现有
}

export interface SessionSummary {
  id: string;                         // menuSessionId
  date: string;                       // ISO date
  restaurantType?: string;            // "泰式" / "日料" / "意大利"
  dishesOrdered: string[];            // 最终点的菜
  dishesSkipped: string[];            // 明确拒绝的菜
  preferencesLearned: string[];       // 新发现的偏好信号
  keyMoments: string[];               // AI 生成的关键决策摘要（2-3 句）
  summarized: boolean;                // 是否已生成摘要
}

export interface SAGE_Memory {
  version: 1;
  preferences: UserPreferences;
  sessions: SessionSummary[];         // 最近 20 次，FIFO
  lastUpdated: number;                // timestamp
}
```

### 存储架构

```
前端 localStorage (sage_memory_v1)
  ├── preferences: UserPreferences     ← 实时更新（F09 preferenceUpdates）
  ├── sessions: SessionSummary[]       ← 懒摘要填充
  └── currentMessages: ChatMessage[]   ← 当前会话消息（带 sessionId）

App 启动时:
  1. 读取 localStorage
  2. 检测 currentMessages 中是否有未摘要的旧会话
  3. 如有 → POST /api/memory/summarize → 存入 sessions[] → 清空 currentMessages
  4. 注入记忆到新会话 prompt
```

### Worker API

```typescript
// POST /api/memory/summarize
// Request: { messages: ChatMessage[], preferences: UserPreferences }
// Response: { summary: SessionSummary }
// 
// Worker 调 Qwen3.5-Flash 生成摘要，不存储任何数据
```

### Prompt 注入模板

```
## 用户记忆
饮食限制: {{preferences.restrictions}}
过敏原: {{preferences.allergies}}
口味: 辣度{{preferences.spicyLevel}}, 偏好{{preferences.flavors}}

## 历史用餐（最近）
{{#each recentSessions}}
- {{date}} {{restaurantType}}: 点了{{dishesOrdered}}, 
  跳过{{dishesSkipped}}。{{keyMoments}}
{{/each}}
```

## 验收标准

| # | 标准 | 优先级 | 验证方式 |
|---|------|--------|---------|
| AC1 | 偏好跨会话持久化，刷新后保留 | P0 | 单测 + 手动 |
| AC2 | schema v1 版本化，支持 migration | P0 | 单测 |
| AC3 | 下次打开 App 自动对旧会话生成摘要 | P1 | 集成测试 |
| AC4 | 摘要包含点了什么/跳过什么/偏好信号 | P1 | AI 输出验证 |
| AC5 | 新会话 prompt 注入最近 5 次历史 | P2 | prompt 检查 |
| AC6 | 2 小时 / 新扫描 / Home"新的" = 新会话 | P1 | 单测 |
| AC7 | sessions[] 最多 20 条，FIFO | P0 | 单测 |
| AC8 | Worker /api/memory/summarize 不存储用户数据 | P0 | 代码审查 |

## 实现计划

| Step | 任务 | 预计 |
|------|------|------|
| 1 | shared/types.ts + 偏好迁移 + 版本化 | 2h |
| 2 | 会话消息持久化 + sessionId 标记 + 边界检测 | 3h |
| 3 | Worker /api/memory/summarize 端点 | 2h |
| 4 | App 启动懒摘要流程 | 2h |
| 5 | Prompt 注入 + 自我进化 | 2h |
| 6 | 测试 + 审查 + 部署 | 3h |

## 不做

- 云端同步 / 多设备共享 / 用户账户
- navigator.sendBeacon 实时摘要（D 方案不需要）
- 摘要编辑 UI（MVP 不需要）
