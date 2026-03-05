# TASK: Memory System Step 1 — 统一偏好结构 + 版本化迁移

## 必读文件
- `specs/sprint-4b-memory.md` — 完整 Spec（v2.1，已 Approved）
- `shared/types.ts` — 现有类型定义
- `app/src/types/index.ts` — 前端 Preferences 类型 + AppState + AppAction
- `app/src/context/AppContext.tsx` — 偏好加载/保存/reducer

## 背景
现有偏好存储在 `localStorage(sage_preferences_v1)` 中，结构简单：
```typescript
interface Preferences { language, dietary[], flavors?[], other?[] }
```
需要升级为带置信度的 SAGE_Memory 结构，同时保证向后兼容（migration）。

## 任务清单

### 1.1 shared/types.ts — 新增类型

在 shared/types.ts 中新增（不删除现有类型，保持向后兼容）：

```typescript
// 偏好进化
export interface PreferenceEntry {
  value: string;
  source: 'explicit' | 'inferred';
  confidence: number;          // 0-1
  firstSeen: string;           // ISO date
  lastSeen: string;
  occurrences: number;
}

export type PreferenceEvolutionAction = 'add' | 'strengthen' | 'modify' | 'weaken';

export interface PreferenceEvolution {
  action: PreferenceEvolutionAction;
  key: string;
  entry?: PreferenceEntry;
  newConfidence?: number;
  oldValue?: string;
  newValue?: string;
}

// 会话摘要
export interface SessionSummary {
  id: string;
  date: string;
  restaurantType?: string;
  dishesOrdered: string[];
  dishesSkipped: string[];
  preferencesLearned: string[];
  keyMoments: string[];
}

// 顶层存储
export interface SAGE_Memory {
  version: 1;
  preferences: {
    restrictions: Restriction[];
    allergies: string[];          // 优先级最高
    flavors: FlavorPreference[];
    spicyLevel: 'none' | 'mild' | 'medium' | 'hot';
    language: 'zh' | 'en';
    learned: PreferenceEntry[];   // AI 学习到的偏好
    history: DiningHistory[];
  };
  sessions: SessionSummary[];     // 最近 20 条 FIFO
  lastUpdated: number;
}
```

### 1.2 app/src/types/index.ts — 更新 Preferences

更新 `Preferences` 接口对齐 SAGE_Memory.preferences：
```typescript
export interface Preferences {
  language: 'zh' | 'en';
  dietary: string[];             // 保留（向后兼容旧数据）
  allergies: string[];           // 新增
  flavors?: string[];
  spicyLevel?: 'none' | 'mild' | 'medium' | 'hot';
  learned?: PreferenceEntry[];   // 新增
  other?: string[];
}
```

### 1.3 app/src/context/AppContext.tsx — Migration 逻辑

更新 `getInitialPreferences()`:
1. 新 STORAGE_KEY: `sage_memory_v1`
2. 读取时先检查旧 key `sage_preferences_v1`
3. 如有旧数据 → 迁移到新结构 → 写入新 key → 删除旧 key
4. 新增字段用默认值: `allergies: []`, `spicyLevel: 'medium'`, `learned: []`

Migration 函数：
```typescript
function migrateV0ToV1(oldPrefs: any): SAGE_Memory {
  return {
    version: 1,
    preferences: {
      restrictions: [], // 从 dietary 映射
      allergies: [],
      flavors: [],
      spicyLevel: 'medium',
      language: oldPrefs.language || 'en',
      learned: [],
      history: [],
    },
    sessions: [],
    lastUpdated: Date.now(),
  };
}
```

### 1.4 app/src/utils/memory.ts — 新建记忆工具模块

```typescript
export const MEMORY_KEY = 'sage_memory_v1';
export const OLD_PREFS_KEY = 'sage_preferences_v1';

export function loadMemory(): SAGE_Memory { ... }
export function saveMemory(memory: SAGE_Memory): void { ... }
export function migrateOldPreferences(): SAGE_Memory | null { ... }
export function addSession(memory: SAGE_Memory, session: SessionSummary): SAGE_Memory {
  // FIFO，最多 20 条
}
export function applyEvolutions(memory: SAGE_Memory, evolutions: PreferenceEvolution[]): SAGE_Memory {
  // 应用偏好进化
}
```

### 1.5 测试

创建 `app/src/utils/__tests__/memory.test.ts`:
- 测试 migration: 旧格式 → 新格式
- 测试 FIFO: 21 条 session → 保留最新 20 条
- 测试 applyEvolutions: add/strengthen/modify/weaken 四种操作
- 测试 loadMemory: 空 localStorage → 返回默认值
- 测试 confidence 衰减: weaken 到 < 0.3

## 约束
- 不修改 Worker 代码
- 不破坏现有 175 单测
- shared/types.ts 中旧类型保留（不删 ChatPreferences 等，后续再清理）
- 确保 `cd app && npx tsc --noEmit` 零错误

## 验收
- [ ] tsc --noEmit 零错误
- [ ] npx vitest run 全通过（包含新测试）
- [ ] localStorage migration 可逆验证
- [ ] SAGE_Memory 类型在 shared/types.ts 中可被前后端共同引用
