# F02 — Scanner（全屏相机页面）Spec

> 从 PRD F02 提取，Sprint 1 实现

## 概述

Scanner 是菜单拍摄的全屏相机页面，支持多张拍摄（最多 5 张）、缩略图预览、单张删除重拍。有两个入口：Home 的「扫描菜单」（Path A 首次进入）和 AgentChat 的「📷 补充菜单」（Path C 对话中途）。

## 用户故事

- 作为用户，我在餐厅拍摄菜单时，可以连续拍多张（正面、背面、酒单），预览后一起提交。
- 作为正在对话的用户，我发现还有甜品单，可以从 Chat 中补拍并自动合并到已有菜单。

## 交互流程

```
[进入 Scanner]
  ├─ 默认激活相机（请求相机权限）
  ├─ 顶部：已拍张数 (X/5) + ✕ 关闭按钮
  ├─ 底部操作区：
  │    ├─ 📷 快门按钮（拍照）
  │    ├─ 🖼 相册按钮（选择已有照片）
  │    └─ 缩略图预览条（已选图片，点击可删除）
  ↓
[已选 ≥ 1 张]
  └─ 「确认」按钮出现
       ↓ 点击确认
  ├─ Path A：关闭 Scanner → 跳转 AgentChat → 开始上传识别
  └─ Path C：关闭 Scanner → 回到 AgentChat → 补充菜单识别 → 合并
```

## 数据模型

引用 `shared/types.ts`：
- `ImageMimeType`：`'image/jpeg' | 'image/png' | 'image/webp' | 'image/heic'`
- `AnalyzeRequestImage`：`{ data: string; mimeType: ImageMimeType }`
- `LIMITS.MAX_IMAGES`：5（最大图片数）
- `LIMITS.MAX_IMAGE_SIZE_MB`：4（单张最大 MB）

前端图片状态：
```typescript
interface CapturedImage {
  id: string;           // 唯一标识
  blob: Blob;           // 原始图片
  thumbnailUrl: string; // 缩略图 URL（URL.createObjectURL）
  mimeType: ImageMimeType;
}
```

## 验收标准

- [ ] AC1: 从 Home 点击到 Scanner 相机激活 < 2 秒
- [ ] AC2: 支持 JPG / PNG / HEIC 格式
- [ ] AC3: 最多 5 张，超过时禁用快门并提示
- [ ] AC4: 已选图片显示缩略图，可单张删除
- [ ] AC5: 相机权限被拒时显示引导说明，相册入口仍可用
- [ ] AC6: 图片上传前压缩至 < 2MB（不影响识别质量）
- [ ] AC7: Path C 进入时保持 AgentChat 对话历史，返回后可继续对话
- [ ] AC8: 补充菜单识别结果与已有菜单合并时，按 dishId 去重（原文菜名 + 价格作为 merge key）；重复菜品保留已有数据；合并后 AI 收到更新通知

## 边界情况

| 场景 | 处理 |
|------|------|
| 相机权限被拒 | 隐藏快门按钮，显示引导文案，相册入口仍可用 |
| 选择超过 5 张 | 快门禁用，toast 提示"最多 5 张" |
| HEIC 格式（iOS） | 前端转换为 JPEG 后上传 |
| 图片过大（> 4MB） | 自动压缩至 < 2MB |
| Path C 补拍时菜品重复 | 按 merge key（原文菜名+价格）去重，保留已有数据 |
| 网络断开时确认发送 | 缓存图片数据，网络恢复后重试 |

## 依赖

- F01（Home）：Path A 入口
- F03（菜单识别）：图片提交后触发识别流程
- F06（AgentChat）：Path C 入口 + 识别结果展示
