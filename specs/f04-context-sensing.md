# F04 — 4+1 维感知数据采集 Spec

> 从 PRD F04 提取，Sprint 1 实现（F04-C 天气为 Sprint 2）

## 概述

4+1 维感知让 AI 理解用户当下的完整用餐场景，而非仅限于菜单内容。五个维度：时间感知、空间感知、环境感知（天气）、视觉感知（菜单图片，由 F03 提供）、历史记忆。感知数据注入 AI 上下文后，AI 可做出更精准的推荐。

## 用户故事

- 作为用户，AI 在晚上 9 点推荐宵夜而非正餐，因为它知道我现在的时间。
- 作为用户，AI 知道我在泰国曼谷，推荐时考虑当地特色。
- 作为回访用户，AI 记得我上次说不吃辣，这次自动避开辣菜。

## 交互流程

```
[进入 App]
  ├─ F04-A 时间感知：自动读取系统时间
  │    └─ 映射时段：07-10 早餐 / 11-14 午餐 / 17-21 晚餐 / 21+ 夜宵
  │
  ├─ F04-B 空间感知：请求 GPS 授权
  │    ├─ 授权通过 → 获取城市级位置 → 注入上下文
  │    └─ 授权拒绝 → 静默跳过，无任何提示
  │
  ├─ F04-C 天气感知 [Sprint 2]：依赖 GPS
  │    └─ MVP 不实现
  │
  └─ F04-D 历史记忆：读取 localStorage
       └─ 用户偏好（restrictions / flavors / history）注入上下文
```

所有感知数据汇聚到 `ChatContext`，随每次 Chat 请求发送：
```
ChatContext {
  language, timestamp, utcOffsetMinutes, location?, weather?
}
```

## 数据模型

引用 `shared/types.ts`：
- `GeoLocation`：`{ lat: number; lng: number; accuracy?: number }`
- `ChatContext`：`{ language: Language; timestamp: number; utcOffsetMinutes?: number; location?: GeoLocation; weather?: { condition: string; temperatureCelsius: number } }`
- `ChatPreferences`：`{ restrictions: Restriction[]; flavors: FlavorPreference[]; history: DiningHistory[] }`
- `Restriction`：`{ type: 'allergy' | 'diet' | 'dislike'; value: string }`
- `FlavorPreference`：`{ type: 'like' | 'dislike'; value: string; strength: 1 | 2 | 3 }`
- `DiningHistory`：`{ restaurantType: string; orderedItems: string[]; timestamp: number; location?: string }`

时段映射逻辑：
```typescript
function getMealPeriod(hour: number): string {
  if (hour >= 7 && hour < 10) return 'breakfast';
  if (hour >= 11 && hour < 14) return 'lunch';
  if (hour >= 17 && hour < 21) return 'dinner';
  if (hour >= 21) return 'late_night';
  return 'other';
}
```

## 验收标准

- [ ] AC1: 所有感知数据采集失败时，主流程不中断
- [ ] AC2: GPS 被拒后无任何弹窗或提示
- [ ] AC3: 历史记忆跨 session 持久（同浏览器/设备）

## 边界情况

| 场景 | 处理 |
|------|------|
| GPS 权限被拒 | 静默跳过，不显示任何提示，AI 推荐不考虑位置维度 |
| GPS 超时 | 5 秒超时后放弃，不阻塞主流程 |
| 时区偏移异常 | 使用浏览器 `Date` 对象，信任系统时间 |
| localStorage 不可用（隐私模式） | 降级为无历史记忆，不报错 |
| localStorage 数据格式损坏 | 清空重建，不影响当前会话 |
| 天气 API 不可用（Sprint 2） | MVP 不实现，weather 字段为 undefined |

## 依赖

- F06（AgentChat）：感知数据通过 `ChatContext` 和 `ChatPreferences` 传递给 AI
- F09（偏好管理）：历史记忆的查看/编辑入口
- F01（Home）：进入 App 时触发 GPS 请求
