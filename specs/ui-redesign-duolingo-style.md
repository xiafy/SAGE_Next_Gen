<!-- [已搁置] 从未实施，保留供未来参考 -->
# Spec: UI/UX 重构 — 多邻国风格

> 版本: v1.0
> 日期: 2026-02-27
> 状态: 🟡 待 Mr. Xia 审批
> 决策依赖: 新 DEC（待编号）

---

## 1. 背景与动机

SAGE 当前 UI 基于 Indigo 配色 + 极简白底 + 细线边框，风格偏「工具感」，缺乏情感连接和品牌辨识度。Mr. Xia 要求参照多邻国的设计语言重构全部页面，提升用户体验和品牌感。

### 1.1 当前 UI 问题

| 问题 | 表现 |
|------|------|
| 配色单调 | 全局只有 Indigo + 白/灰，缺乏层次和活力 |
| 缺乏情感化 | 没有吉祥物、插画、动效，用户感觉在用「工具」而非「伙伴」|
| 卡片设计平淡 | 细边框 + 浅色背景，无立体感 |
| 排版保守 | 字号偏小，层次感不够 |
| 交互反馈弱 | 点击无动效，状态切换突兀 |

### 1.2 多邻国设计核心特征

| 特征 | 描述 | SAGE 适配思路 |
|------|------|-------------|
| **高饱和度配色** | 绿色为主 + 蓝/橙/红/紫点缀，明亮活泼 | 选择适合餐饮场景的暖色主色 |
| **粗圆角 + 厚阴影** | 16-20px 圆角，4px 底部厚阴影（3D 立体按钮感） | 全局卡片/按钮统一 |
| **超粗字体** | 标题用 800/900 weight，正文清晰 | 引入 rounded 字体 |
| **吉祥物驱动** | Duo 鸟贯穿全程，表情丰富 | SAGE 设计专属 mascot |
| **每屏一件事** | 界面极简，聚焦当前任务 | SAGE 已符合 |
| **游戏化元素** | streak、XP、进度条、成就徽章 | Phase 2 引入 |
| **底部导航** | 标准 Tab Bar（Home/Explore/Profile）| 新增底部 Tab |
| **微动效** | 按钮弹跳、卡片滑入、成功撒花 | CSS/Framer Motion |

---

## 2. 设计系统

### 2.1 新配色方案

SAGE 的场景是「旅行者在异国餐厅点餐」——需要**温暖、亲切、让人有食欲**的感觉。

| Token | 色值 | 用途 |
|-------|------|------|
| `--sage-primary` | `#FF6B35` | 主色（暖橙色，食欲感 + 活力） |
| `--sage-primary-dark` | `#E55A2B` | 按钮 hover/pressed |
| `--sage-primary-light` | `#FFF0E8` | 轻背景/选中态 |
| `--sage-secondary` | `#2EC4B6` | 辅助色（青绿，清新感） |
| `--sage-accent` | `#FFBF69` | 强调色（暖黄，高亮/徽章） |
| `--sage-success` | `#4CAF50` | 成功状态 |
| `--sage-error` | `#FF5252` | 错误状态 |
| `--sage-bg` | `#FFFBF5` | 全局背景（暖白，非纯白） |
| `--sage-card` | `#FFFFFF` | 卡片背景 |
| `--sage-text` | `#2D2D2D` | 主文字 |
| `--sage-text-secondary` | `#8E8E8E` | 次要文字 |
| `--sage-border` | `#E8E0D8` | 边框（暖灰） |
| `--sage-shadow` | `0 4px 0 #E8E0D8` | 多邻国式厚底阴影 |

### 2.2 圆角系统

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-sm` | `12px` | 小组件（tag/badge） |
| `--radius-md` | `16px` | 卡片、输入框 |
| `--radius-lg` | `20px` | 大按钮、弹窗 |
| `--radius-full` | `9999px` | 圆形按钮/头像 |

### 2.3 字体

```css
font-family: 'Nunito', 'PingFang SC', 'Noto Sans SC', system-ui, sans-serif;
```

| Level | Size | Weight | 用途 |
|-------|------|--------|------|
| Display | 28px | 800 | 页面大标题 |
| H1 | 24px | 700 | 区块标题 |
| H2 | 20px | 700 | 卡片标题 |
| Body | 16px | 600 | 正文 |
| Caption | 14px | 600 | 辅助文字 |
| Small | 12px | 600 | 标签/badge |

### 2.4 按钮系统（多邻国 3D 风格）

```css
/* Primary Button */
.btn-primary {
  background: var(--sage-primary);
  color: white;
  border: none;
  border-radius: var(--radius-lg);
  box-shadow: 0 4px 0 var(--sage-primary-dark);
  font-weight: 700;
  font-size: 16px;
  padding: 14px 28px;
  transition: all 0.1s;
}
.btn-primary:active {
  transform: translateY(4px);
  box-shadow: none;
}
```

按钮变体：
- **Primary**：橙色底 + 深橙阴影（主 CTA）
- **Secondary**：白底 + 橙色边框 + 灰阴影
- **Ghost**：透明底 + 文字色
- **Danger**：红色底 + 深红阴影

### 2.5 卡片系统

```css
.card {
  background: var(--sage-card);
  border-radius: var(--radius-md);
  border: 2px solid var(--sage-border);
  box-shadow: 0 4px 0 var(--sage-border);
  padding: 16px;
}
```

### 2.6 标签/Chip（偏好选择等）

```css
.chip {
  border-radius: var(--radius-full);
  border: 2px solid var(--sage-border);
  padding: 8px 16px;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.15s;
}
.chip--selected {
  background: var(--sage-primary-light);
  border-color: var(--sage-primary);
  color: var(--sage-primary);
}
```

---

## 3. 吉祥物设计

### 3.1 角色定位

| 属性 | 定义 |
|------|------|
| **名字** | Sage（与产品同名，双关「鼠尾草/智者」）|
| **形象** | 一只圆滚滚的青绿小鸟厨师（亲切 + 美食的交集）|
| **性格** | 热心、幽默、懂吃、微微傲娇 |
| **穿着** | 小厨师帽 + 碗状腰围裙（围裙内可装水果/食材，是标志性特征）|
| **配色** | 身体青绿 #2EC4B6，肚皮奶油 #FFF5E6，喙和脚橙色 #E55A2B，围裙米黄 #FFFACD，鼠尾草绿点缀 #93C572 |

### 3.1b 设计稿定稿

Character Sheet 已由 Mr. Xia 使用 Gemini 生成并确认（2026-02-27）。

**定稿要点（以实际生成图为准）**：
- 四视图：正面 / ¾ Q版 / 侧面 / 背面
- 身体为梨形（头 140px : 身体 140px），描线 2.5px
- 围裙为碗状设计（非平面腰围裙），内可见水果/食材装饰
- 围裙正面有鼠尾草叶刺绣
- 翅膀三段羽尖，可用作手持物品
- 耳羽为柔软圆润造型（非猫头鹰式尖耳）
- 眼睛高光固定在右上方
- 已有 4 个表情：Happy / Surprised / Tasting / Chef Pose
- 已有 App icon 示意图（深色圆角方形底 + 头部特写）

**资源路径**：
- `app/public/mascot/character-sheet.jpg` — 角色四视图设计稿
- `app/public/mascot/expressions-sheet-1.jpg` — 表情包第一批（8个：Super Happy / Nervousness / Ecstasy / Anger / Pride / Confusion / Exhaustion / Fear）
- `app/public/mascot/expressions-sheet-2-补充.jpg` — 表情包第二批（4个补充：Default / Confusion / Thinking / Goodbye，含上方原始4个）
- `app/public/mascot/expressions-export-spec.jpg` — 导出规格表（512/256/128px 三级尺寸）

**App 内使用映射（最终 8 个核心表情）**：

| 文件名 | 来源 | 用途 |
|--------|------|------|
| `sage-default.png` | Sheet 2 — 默认 | Home 页、通用状态 |
| `sage-thinking.png` | Sheet 2 — 思考 | 菜单识别加载中 |
| `sage-excited.png` | Sheet 1 — Super Happy | 推荐菜品、发现好菜 |
| `sage-eating.png` | Sheet 1 — Ecstasy | 点餐完成、确认选择 |
| `sage-confused.png` | Sheet 1 — Confusion | 识别失败、错误 |
| `sage-celebrating.png` | Sheet 1 — Pride | 点餐单完成、成功 |
| `sage-waving.png` | Sheet 2 — Goodbye | 服务员模式、退出 |
| `sage-sleeping.png` | Sheet 1 — Exhaustion | 空闲、占位 |

**备用表情（不在 MVP，可用于后续游戏化/推送）**：
- Nervousness/Anxiety → 等待超时、网络慢
- Anger → 超出免费次数限制
- Fear → 彩蛋/特殊场景

### 3.2 表情状态（8 个完整集）

| 状态 | 表情 | 使用场景 |
|------|------|---------|
| `default` | 微笑，右翅举手打招呼 | Home 页、通用状态 |
| `thinking` | 闭眼沉思，左翅托下巴，右翅持放大镜 | 菜单识别加载中 |
| `excited` | 大眼放光，双翅举过头顶，嘴巴大笑 | 推荐菜品时、发现好菜 |
| `eating` | 眯眼享受，脸颊红晕，嘴边食物碎屑 | 点餐完成、确认选择 |
| `confused` | 歪头，一大一小眼，头顶问号 | 识别失败/错误 |
| `celebrating` | 双翅举起，手持叉刀，周围撒花 | 点餐单完成、成功状态 |
| `waving` | 温暖微笑，右翅高举挥手，小爱心浮出 | 服务员模式/退出/再见 |
| `sleeping` | 安详闭眼，zzz 飘出，厨师帽歪了 | 空闲/占位/未使用状态 |

### 3.3 AI 图片生成 Prompt

> ⚠️ 复盘教训：Prompt A/B/B2 生成的是「设计手册」合成图（带标注、网格、尺寸标记），无法直接切图使用。
> 根因：使用了 "character sheet"、"expression sheet"、"annotation" 等设计文档术语，且要求多角色合成在一张图上。
> 改进：改为逐个生成单独素材，明确 negative constraints（不要文字/标注/网格）。
> Prompt A/B/B2 已归档（生成了可用的设计参考图），以下 Prompt D 是正式的素材生成 prompt。

#### Prompt A/B/B2（已归档，用于生成设计参考图）

上述 prompt 生成了角色设计稿和表情参考图，已存档于 `app/public/mascot/` 目录。
作为后续素材生成的风格参考使用，不再作为直接素材。

#### Prompt D：单个表情素材导出（正式版，逐个生成）

> **8 个独立 prompt 文件**：`specs/mascot-prompts/01-default.md` ~ `08-sleeping.md`
> **使用方法**：打开对应 .md 文件，将分隔线以下的完整文本作为 prompt，附上 character-sheet.jpg 作为风格参考。
> 每次运行 1 个 prompt，得到 1 张干净的 1024x1024 PNG。共 8 次。

```
Generate a single illustration of my mascot character "Sage" — a cute teal bird chef.

CRITICAL CONSTRAINTS — read these first:
- Output ONLY the character on a pure white background
- Do NOT include any text, labels, titles, annotations, or watermarks
- Do NOT include any grid lines, color swatches, size markers, or design notes
- Do NOT include any Chinese or English text anywhere in the image
- Do NOT include any "Feeling:", "Chef Hat:", "Blush:" parameter descriptions
- The image must contain NOTHING except the single bird character and its floating elements (if any)

Character (match the attached reference image exactly):
- Cute round teal bird, body color #2EC4B6, cream belly #FFF5E6
- Orange beak and feet #E55A2B
- Small white chef hat, bowl-shaped cream apron #FFFACD with sage leaf embroidery
- Pear-shaped body, large round eyes with orange iris #FF6B35
- Short stubby wings with 3-segment feather tips
- Flat vector style, 2.5px dark charcoal outline #2D2D2D, solid color fills
- NO gradients, NO 3D effects, NO realistic textures, NO ground shadow

Pose and expression:
{{EXPRESSION_BLOCK}}

Output requirements:
- Square canvas, 1024x1024 pixels
- Character centered horizontally and vertically
- Character fills about 70-80% of the canvas height
- Full body visible from hat to feet — NOTHING cropped or cut off
- Pure white background (#FFFFFF)
- PNG format with no transparency needed (white bg is fine)
- Clean, production-ready asset — no annotations of any kind
```

#### 8 个表情替换段落（逐个替换 `{{EXPRESSION_BLOCK}}`）

**① default — 默认打招呼** （Home 页，最重要的表情）
```
Calm, warm, welcoming greeting — NOT overly excited.
Gentle closed-mouth smile, beak curves softly upward.
Eyes open, warm, looking directly at viewer. Relaxed eyebrows.
Right wing raised to shoulder height, open palm, casual wave.
Left wing relaxed at side.
Body straight, centered, no lean.
Chef hat perfectly straight on head.
NO held items — both wings empty.
NO floating elements — clean baseline state.
```

**② thinking — 思考分析** （菜单识别加载中）
```
Focused, calm concentration — a chef studying a recipe, NOT anxious.
Eyes gently closed — soft downward-curving lines, peaceful.
Eyebrows slightly drawn together, studious focus.
Left wing raised to chin, feather-tip touching bottom of beak (thinker's pose).
Right wing holding a small magnifying glass (brown handle #D4A76A, light blue lens).
Body slightly leaned forward (~3 degrees).
Chef hat straight.
Three small gray dots (#8E8E8E) floating above head to the right.
```

**③ excited — 兴奋推荐** （发现好菜推荐时）
```
Thrilled, energetic — discovered an amazing dish!
Eyes extra wide with star-shaped sparkle highlights.
Beak wide open, big smile, tiny pink tongue visible.
Both wings thrown up above head, spread wide open.
Eyebrows raised high with excitement.
Chef hat popping up slightly, floating above head with motion arc.
2-3 small orange (#FF6B35) sparkle stars floating around head.
```

**④ eating — 品尝满足** （点餐确认、美食享受）
```
Pure bliss from tasting delicious food.
Eyes squeezed shut in happiness (upward curves like ^_^).
Soft pink blush circles on cheeks.
Both wings clasped together at chest level, delighted.
Beak closed with deeply satisfied upward curve.
2-3 tiny orange crumb dots near beak.
Small steam wisps (2 wavy lines) rising from below.
Chef hat tilted ~10 degrees from excitement.
```

**⑤ confused — 困惑错误** （识别失败、出错时）
```
Puzzled — something unexpected happened.
Head tilted 15 degrees to the right.
One eye slightly larger than the other (comic confusion).
Asymmetric eyebrows: left raised high, right lowered.
Left wing scratching behind the head.
Right wing at side, palm up in a small shrug.
Large orange outlined "?" symbol floating above head.
Chef hat tilted LEFT, opposite to head tilt direction.
Beak slightly open, uncertain expression.
```

**⑥ celebrating — 庆祝成功** （点餐单完成）
```
Joyful celebration — order card is ready!
Wide joyful eyes, closed-mouth beaming smile.
Right wing raised, holding tiny crossed silver fork and knife.
Left wing raised in a fist pump.
4-5 small confetti particles around body (orange, teal, yellow dots and rectangles).
Small motion/wiggle lines around body.
Chef hat bouncing up with small arc motion line above it.
```

**⑦ waving — 挥手再见** （服务员模式、退出）
```
Warm, fond farewell — a friend seeing you off at the restaurant door.
Warm soft smile, eyes slightly narrowed with affection (smiling with eyes).
Subtle pink blush on cheeks.
Right wing raised HIGH above head, full extension, open palm goodbye wave.
Left wing at waist level, gently touching the apron edge.
Slight body lean to the left (~5 degrees).
One small orange (#FF6B35) outlined heart floating near the waving wing.
```

**⑧ sleeping — 休息空闲** （空闲占位状态）
```
Peacefully dozing off during downtime.
Eyes closed with horizontal curved lines, peaceful.
Both wings tucked in close to body, hugging self.
Chef hat slipped down, covering one eye area.
Three "z" letters in teal (#2EC4B6) floating above head, decreasing size.
Tiny sleep bubble from beak corner.
Body leaning slightly to one side (~8 degrees).
```

#### 素材后处理（SAGE Agent 用 Python 执行）

用 Prompt D 获得 8 张 1024x1024 单独 PNG 后，SAGE Agent 自动执行：

```python
# 从 1024x1024 原图生成 3 种尺寸
sizes = {
    'full': 512,    # Home 页、空状态
    'head-128': 128, # Chat 头像、导航图标（自动裁切上半部分）
    'head-64': 64,   # 内联 emoji
}
# 输出文件命名：sage-{expression}-{size}.png
# 共 8 表情 × 3 尺寸 = 24 个 PNG
```

---

## 4. 页面重构规格

### 4.1 底部导航栏（新增）

```
[ 🏠 首页 ]  [ 📋 点餐单 ]  [ ⚙️ 设置 ]
```

- 固定底部，高度 64px + safe-area-inset-bottom
- 选中态：图标 + 文字变 `--sage-primary`，图标上方小圆点指示器
- 多邻国风格：图标用圆润线条，选中时微弹跳动效

### 4.2 HomeView 重构

**当前**：白底 + 品牌标题 + 单个大按钮

**新设计**：
```
┌─────────────────────────────┐
│  暖白背景 (--sage-bg)        │
│                             │
│     [Sage 猫头鹰 default]    │
│                             │
│   「嗨！今天想吃什么？」       │
│   (28px, weight 800)        │
│                             │
│  ┌─────────────────────┐    │
│  │  📸 扫描菜单          │    │  ← 3D 橙色大按钮
│  │  拍照识别，智能推荐    │    │
│  └─────────────────────┘    │
│                             │
│  ┌─────────────────────┐    │
│  │  💬 随便聊聊          │    │  ← 白底边框按钮（Path B 预留）
│  │  不看菜单，直接推荐    │    │
│  └─────────────────────┘    │
│                             │
│  ┌──────────┬──────────┐    │
│  │ 📋 点餐单 │ ⚙️ 设置  │    │  ← 底部导航
│  └──────────┴──────────┘    │
└─────────────────────────────┘
```

- 问候语根据时间段变化（保留现有逻辑）
- 吉祥物占据视觉中心，增强情感连接
- 两个入口按钮：扫描（主）+ 聊聊（次）
- 第一次打开时可加入简单的吉祥物弹跳动画

### 4.3 ScannerView 重构

**保留**：深色全屏相机界面（拍照场景需要深色）

**调整**：
- 快门按钮改为橙色圆形 + 白色边框，多邻国式 3D 效果
- 缩略图条背景用半透明暖色 `rgba(255,107,53,0.1)`
- 「确认」按钮改为 3D 橙色大按钮
- 单页/多页 toggle 改为圆角胶囊切换器，选中态橙色
- 顶部返回箭头加大触控区域

### 4.4 AgentChatView 重构

**当前**：标准 chat bubbles，灰/蓝配色

**新设计**：
- **AI 气泡**：左侧小头像用 Sage 猫头鹰，气泡用白底 + 粗圆角 + 厚阴影
- **用户气泡**：右侧，橙色底 + 白字 + 深橙阴影
- **Quick Replies**：改为横向滚动的 3D 胶囊按钮（白底 + 橙边框 + 灰阴影）
- **推荐卡片**：
  ```
  ┌──────────────────────────┐
  │ 🍜 泰式冬阴功 Tom Yum    │  ← H2 粗体
  │ ¥68                      │  ← 橙色价格
  │ 酸辣鲜香，招牌必点         │  ← Caption 灰字
  │ ┌──────────────────────┐ │
  │ │  ➕ 加入点餐单         │ │  ← 小 3D 按钮
  │ └──────────────────────┘ │
  └──────────────────────────┘
  ```
  卡片有多邻国式厚底阴影，点击微弹跳
- **加载状态**：Sage 猫头鹰 `thinking` 表情 + 「正在思考...」替代纯文字 loading dots
- **识别阶段**：进度条改为橙色 + 圆角，下方显示猫头鹰 `thinking` 动画

### 4.5 SettingsView 重构

**当前**：白底 + 细边框标签 + 分隔线

**新设计**：
- 背景改为 `--sage-bg`（暖白）
- 每个 section 是独立卡片（白底 + 圆角 + 厚阴影）
- 语言切换：两个 3D 胶囊按钮并排
- 饮食限制/口味偏好：chip 改为多邻国式选择按钮（圆角 + 粗边框，选中态橙色填充）
- 自定义偏好输入框：粗圆角 + 2px 边框
- 「添加」按钮：小号 3D 橙色按钮
- 底部「重置」按钮：红色 3D 按钮

### 4.6 OrderCardView 重构

- 列表项改为卡片式，每道菜一个圆角卡片
- 数量控制按钮：圆形 3D 按钮（+/-）
- 合计金额：大号粗体 + 橙色
- 「展示给服务员」按钮：全宽 3D 按钮，特大号
- 空状态：Sage 猫头鹰 `confused` 表情 + 「还没点菜呢，去扫描菜单吧！」

### 4.7 WaiterModeView 重构

- 保持黑底大字核心设计（服务员可读性最重要）
- 顶部加 Sage 猫头鹰 `waving` 小图标
- 菜名卡片加细微圆角和分隔
- 「返回」按钮改为 3D 白色按钮

### 4.8 ExploreView 重构

- 分类 tab 改为多邻国式横向滚动胶囊
- 菜品列表改为卡片式（圆角 + 阴影）
- 空状态：Sage 猫头鹰 + 引导扫描

---

## 5. 动效规格（Phase 1 最小集）

| 动效 | 实现 | 触发时机 |
|------|------|---------|
| 按钮按下 | `translateY(4px)` + 阴影消失 | 所有 3D 按钮 |
| 页面切换 | `fadeIn 0.2s` | 视图切换 |
| 卡片出现 | `slideUp 0.3s ease-out` | 列表项/推荐卡片 |
| 吉祥物弹跳 | `bounceIn 0.5s` | 首次进入 Home |
| Quick Reply 横滚 | CSS `overflow-x: auto` + snap | AgentChat |
| 成功反馈 | 短暂绿色闪烁 + check 图标 | 加入点餐单 |

实现方式：CSS animations 为主，复杂动效用 Framer Motion（后续引入）。

---

## 6. 技术实现方案

### 6.1 依赖变更

```diff
+ @fontsource/nunito  (rounded font)
  # Framer Motion 暂不引入，Phase 1 用 CSS 动效
```

### 6.2 文件变更范围

| 文件 | 变更类型 | 说明 |
|------|---------|------|
| `app/src/index.css` | 重写 | Tailwind v4 @theme 全新 token |
| `app/src/App.tsx` | 修改 | 新增底部导航栏组件 |
| `app/src/components/MascotImage.tsx` | 新增 | 吉祥物图片组件（按状态显示不同表情） |
| `app/src/components/Button3D.tsx` | 新增 | 多邻国式 3D 按钮通用组件 |
| `app/src/components/Card3D.tsx` | 新增 | 多邻国式 3D 卡片通用组件 |
| `app/src/components/Chip.tsx` | 新增 | 选择标签组件 |
| `app/src/components/ChatBubble.tsx` | 重写 | 新气泡样式 + 吉祥物头像 |
| `app/src/components/QuickReplies.tsx` | 重写 | 横向滚动 3D 胶囊 |
| `app/src/components/TopBar.tsx` | 修改 | 适配新配色 |
| `app/src/views/HomeView.tsx` | 重写 | 全新布局 + 吉祥物 |
| `app/src/views/ScannerView.tsx` | 修改 | 按钮/控件样式更新 |
| `app/src/views/AgentChatView.tsx` | 重写 | 新气泡 + 推荐卡片 + loading |
| `app/src/views/SettingsView.tsx` | 重写 | 卡片化 + 新 chip |
| `app/src/views/OrderCardView.tsx` | 重写 | 卡片列表 + 3D 按钮 |
| `app/src/views/WaiterModeView.tsx` | 修改 | 微调 |
| `app/src/views/ExploreView.tsx` | 重写 | 胶囊 tab + 卡片 |
| `app/public/mascot/` | 新增 | 吉祥物图片资源（6 个表情 PNG） |

### 6.3 执行分期

**Phase 1（本次）**：设计系统 + 全页面视觉重构
- 新配色/字体/圆角/阴影 token
- 通用组件（Button3D / Card3D / Chip / MascotImage）
- 全部 7 个 View 重构
- CSS 基础动效
- 吉祥物占位图（等 Mr. Xia 用 AI 生成后替换）

**Phase 2（后续）**：游戏化元素
- 用餐 streak（连续使用天数）
- XP 积分系统
- 成就徽章
- Framer Motion 丰富动效

---

## 7. 验收标准

### AC-1: 配色一致性
- [ ] 全局无 Indigo `#6366F1` 残留
- [ ] 所有颜色使用 CSS 变量 token

### AC-2: 多邻国式组件
- [ ] 所有按钮有 3D 厚底阴影 + 按下动效
- [ ] 所有卡片有圆角 16px + 厚底阴影
- [ ] 标签/chip 为圆角胶囊式

### AC-3: 吉祥物
- [ ] Home 页显示 Sage 猫头鹰（default 表情）
- [ ] 加载状态显示 thinking 表情
- [ ] 错误状态显示 confused 表情
- [ ] 空状态显示对应表情

### AC-4: 底部导航
- [ ] 固定底部，三个 Tab（首页/点餐单/设置）
- [ ] 选中态橙色 + 微弹跳
- [ ] safe-area-inset-bottom 适配

### AC-5: 排版
- [ ] 全局使用 Nunito 字体
- [ ] 标题 28px/800，正文 16px/600

### AC-6: 暖色调
- [ ] 背景为暖白 `#FFFBF5` 非纯白
- [ ] 整体视觉温暖、有食欲感

### AC-7: 兼容性
- [ ] iOS Safari 正常
- [ ] Android Chrome 正常
- [ ] `npm run build` 成功
- [ ] `tsc --noEmit` 零错误

---

## 8. 开放问题

| # | 问题 | 状态 |
|---|------|------|
| OQ-1 | 吉祥物图片：等 Mr. Xia 用 AI 生成，Phase 1 先用 emoji 占位？ | 待确认 |
| OQ-2 | 品牌名「SAGE」的 logo 字体是否也改为 Nunito ExtraBold？ | 待确认 |
| OQ-3 | Path B「随便聊聊」Home 页入口是否本次加上（UI 占位，功能后做）？ | 待确认 |
