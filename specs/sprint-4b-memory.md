# Sprint 4b: Memory System (DEC-067)

> 版本: v1.0
> 日期: 2026-03-04
> 状态: Draft

## 目标

实现跨会话记忆能力，让 SAGE 从"工具"升级为"伙伴"。

## 核心能力

### 1. 用户偏好持久化（当前已有 localStorage，需升级）

**现状**: `localStorage` 存 `sage-preferences`，仅本地有效

**升级**: 
- 结构化存储：饮食限制、口味偏好、过敏原、常用语言
- 版本化：schema version + migration
- 导出/导入：用户可备份

### 2. 会话历史摘要

**现状**: 无历史会话记录

**新增**:
- 每次会话结束后生成摘要（AI 驱动）
- 存储关键决策：点了什么菜、跳过什么推荐、偏好更新
- 支持"上次你说..."式引用

### 3. 跨会话记忆检索

**现状**: 无

**新增**:
- 新会话开始时检索相关历史
- Prompt 注入："用户上次在泰国餐厅点了冬阴功，偏好辣度中等"
- 隐私边界：仅存储用户明确同意的数据

## 技术设计

### 存储层

```typescript
// localStorage schema v1
interface SAGE_Memory {
  version: 1;
  preferences: {
    restrictions: string[];      // ['vegetarian', 'halal']
    allergies: string[];         // ['peanut', 'shellfish']
    tasteProfile: {
      spicyLevel: 'none' | 'mild' | 'medium' | 'hot';
      sweetLevel: 'low' | 'medium' | 'high';
    };
    language: 'zh' | 'en' | 'th' | 'ja';
  };
  sessions: SessionSummary[];
  lastUpdated: number;  // timestamp
}

interface SessionSummary {
  id: string;
  date: string;  // ISO date
  location?: { lat: number; lng: number; name: string };
  dishesOrdered: string[];  // dish names
  preferencesChanged: boolean;
  keyDecisions: string[];  // AI-generated summary
}
```

### API 层 (Worker)

```typescript
// POST /api/memory
// Request: { action: 'get' | 'update' | 'summarize', data: ... }
// Response: { memory: SAGE_Memory, summary?: string }

// 会话结束时自动调用 summarize
```

### Prompt 注入

```
用户记忆摘要：
- 饮食限制：{{memory.preferences.restrictions.join(', ')}}
- 过敏原：{{memory.preferences.allergies.join(', ')}}
- 口味偏好：辣度{{memory.preferences.tasteProfile.spicyLevel}}
- 上次用餐：{{memory.sessions[0]?.date}} 在 {{memory.sessions[0]?.location?.name}} 点了 {{memory.sessions[0]?.dishesOrdered.join(', ')}}
```

## 验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 偏好设置跨会话持久化 | 刷新页面后偏好保留 |
| 2 | 会话摘要自动生成 | 每次会话结束调用 summarize |
| 3 | 新会话 Prompt 注入记忆 | 人工检查 Prompt |
| 4 | 隐私边界清晰 | 无敏感数据（支付、位置精确坐标）存储 |
| 5 | 存储 schema 版本化 | 支持 future migration |

## 优先级

P0: 偏好持久化 schema v1 + 版本化
P1: 会话摘要生成
P2: 跨会话检索 + Prompt 注入

## 不做范围

- 云端同步（需后端数据库，超出当前架构）
- 多设备共享
- 用户账户系统
