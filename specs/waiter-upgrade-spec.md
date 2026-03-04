# Spec: Waiter Mode 升级（过敏栏 + 沟通面板）

> 版本: 1.0 | 日期: 2026-03-02
> 覆盖决策: DEC-056, DEC-060

---

## 1. 目标与背景

升级 Waiter Mode，增加两个核心能力：
1. **过敏/禁忌安全屏障**（DEC-056）：进入前过敏原检查 + 顶部过敏栏
2. **指点式沟通面板**（DEC-060）：解决服务员-用户语言障碍的餐桌沟通工具

**核心原则**：
- SAGE 不只是点餐工具，也是餐桌上的沟通桥梁
- 零学习成本：服务员只需指，用户点击
- 场景聚焦：只提供餐饮相关选项

---

## 2. 数据结构

### 2.1 过敏原匹配数据

```typescript
/** 用户过敏原与菜品匹配结果 */
export interface AllergenMatchResult {
  menuItem: MenuItem;
  matchedAllergens: AllergenTag[];  // 命中用户过敏原的标签列表
}

/** 过敏栏展示数据 */
export interface AllergyBannerData {
  allergens: string[];         // 用户声明的过敏原（英文标准名）
  restrictions: string[];      // 饮食禁忌（如 vegetarian, halal）
  detectedLanguage: string;    // 菜单所在地语言代码（来自 menuData.detectedLanguage）
}
```

### 2.2 沟通面板操作类型

```typescript
export type CommunicationAction = 'sold_out' | 'change' | 'add_more' | 'other';

export interface CommunicationOption {
  action: CommunicationAction;
  icon: string;
  labelUser: string;      // 用户语言
  labelLocal: string;     // 餐厅当地语言
}
```

---

## 3. WaiterAllergyBanner 组件（DEC-056）

### 3.1 Props

```typescript
interface WaiterAllergyBannerProps {
  allergyData: AllergyBannerData;
  isZh: boolean;
}
```

### 3.2 渲染规格

- **位置**：Waiter Mode 菜品列表上方，第一眼可见
- **条件**：仅在用户有声明过敏原/饮食禁忌时显示
- **三语展示**（确保服务员看懂）：
  ```
  ⚠️ 🥜 Peanut allergy · ไม่ทานถั่ว
  ⚠️ 🥬 Vegetarian · มังสวิรัติ
  ```
  - 第一列：图标（emoji）
  - 第二列：英文（国际通用）
  - 第三列：菜单所在地本地语言
- **视觉**：橙色/红色警示底色，白字大号，高对比度
- **字号**：≥ 20px（确保服务员距离可读）

### 3.3 本地语言翻译映射

```typescript
/** 常见过敏原/禁忌的多语言翻译表 */
const ALLERGY_TRANSLATIONS: Record<string, Record<string, string>> = {
  'peanut': { th: 'ไม่ทานถั่ว', ja: 'ピーナッツアレルギー', ko: '땅콩 알레르기', zh: '花生过敏', ... },
  'shellfish': { th: 'ไม่ทานอาหารทะเล', ja: '甲殻類アレルギー', ... },
  'vegetarian': { th: 'มังสวิรัติ', ja: 'ベジタリアン', ... },
  // ... 完整表待实现
};
```

语言代码来自 `menuData.detectedLanguage`（AI 识别菜单时检测）。

---

## 4. AllergenWarningSheet 组件（DEC-056）

### 4.1 Props

```typescript
interface AllergenWarningSheetProps {
  matches: AllergenMatchResult[];
  isZh: boolean;
  onConfirm: () => void;      // 确认并继续 → 进入 Waiter
  onGoBack: () => void;       // 返回修改 → 回到 Order
}
```

### 4.2 触发条件

进入 Waiter Mode 前（无论来源路径：Order→Waiter 或 Explore→Waiter），检查：
1. 用户是否声明了过敏原（preferences.dietary 中过敏相关项）
2. Order 中是否有菜品的 allergens 命中用户过敏原

两个条件同时满足 → 弹出底部 sheet。

### 4.3 渲染规格

- **形态**：底部 sheet（从底部滑入，遮罩背景）
- **标题**："⚠️ 过敏原提醒" / "⚠️ Allergen Warning"
- **内容**：
  ```
  以下菜品可能含有你的过敏原，建议向服务员确认：
  
  🥜 Pad Thai（花生）
  🦐 Tom Yum Goong（甲壳类）
  ```
  每行：过敏原图标 + 菜名 + 匹配的过敏原名称
- **按钮**：
  - 「确认并继续」→ 进入 Waiter Mode
  - 「返回修改」→ 回到 Order 页面
- **底部 disclaimer**（常驻小字）："过敏原信息仅供参考，请向餐厅确认"
- 确认后进入 Waiter，不再重复提醒

### 4.4 无匹配情况

用户有过敏原声明但 Order 中无匹配菜品 → 不弹 sheet，直接进入 Waiter。

---

## 5. DishCommunicationPanel 组件（DEC-060）

### 5.1 Props

```typescript
interface DishCommunicationPanelProps {
  menuItem: MenuItem;
  detectedLanguage: string;
  isZh: boolean;
  onSoldOut: () => void;
  onChange: () => void;
  onAddMore: () => void;
  onOther: () => void;
  onClose: () => void;
}
```

### 5.2 触发

Waiter Mode 下，点击任意菜品行 → 弹出沟通面板。

### 5.3 渲染规格

**第一屏：选项面板**

```
┌─────────────────────────────┐
│     Pad Thai ผัดไทย          │  ← 菜品名（双语大字）
│                              │
│  🚫  没有了                   │  ← 用户语言
│      ไม่มี                   │  ← 当地语言
│                              │
│  🔄  换一道                   │
│      เปลี่ยน                  │
│                              │
│  ➕  加一份                   │
│      เพิ่ม                    │
│                              │
│  ❓  其他问题                  │
│      อื่นๆ                   │
│                              │
│         [× 关闭]              │
└─────────────────────────────┘
```

- 选项按钮大面积触控（≥ 56px 高度）
- 双语展示：上方用户语言（大字），下方当地语言（大字）
- 字号 ≥ 22px（面向服务员展示）
- 深色背景（延续 Waiter Mode 风格）

**第二屏：大字确认**

选择某选项后，全屏展示该选项的当地语言大字：

```
┌─────────────────────────────┐
│                              │
│                              │
│       ผัดไทย ไม่มี            │  ← 菜品名 + 操作（当地语言）
│       Pad Thai - Sold Out    │  ← 英文对照
│                              │
│                              │
│         [✅ 确认]              │
│         [← 返回]              │
└─────────────────────────────┘
```

- 超大字号（≥ 36px），确保服务员可从对面看清
- 确认后执行对应操作

### 5.4 四选项完整交互流程

#### 🚫 没有了（Sold Out）

```
点击 → 大字确认（当地语言）→ 确认 →
  1. 从 Order 移除该菜品
  2. toast: "已移除 {菜名}"
  3. 弹出提示："需要 AI 推荐替代品吗？"
     ├── "好的" → NAV_TO('chat')，自动发消息给 AI："{菜名} 售罄了，帮我推荐替代品"
     └── "不用了" → 关闭面板，留在 Waiter
```

#### 🔄 换一道（Change）

```
点击 → 大字确认（当地语言："请推荐其他菜"）→ 确认 →
  提示用户选择方式：
  ├── "让 AI 推荐" → NAV_TO('chat')，自动发："想把 {菜名} 换成别的，有什么建议？"
  └── "自己选" → NAV_TO('explore')
```

#### ➕ 加一份（Add More）

```
点击 → 大字确认（当地语言："再来一份"）→ 确认 →
  Order 中该菜品 quantity + 1
  toast: "{菜名} +1"
  关闭面板，留在 Waiter（刷新数量显示）
```

#### ❓ 其他问题（Other）

```
点击 → NAV_TO('chat')
  自动发消息给 AI："关于 {菜名}，我有个问题想问"
  携带菜品上下文
```

---

## 6. 本地语言检测

- **来源**：`menuData.detectedLanguage`（AI 在菜单识别阶段检测）
- **格式**：ISO 语言代码（如 'th', 'ja', 'ko', 'fr', 'es', 'it', 'de', 'zh', 'en'）
- **用途**：
  - WaiterAllergyBanner 本地语言列
  - DishCommunicationPanel 当地语言行
  - 大字确认屏的当地语言
- **降级**：detectedLanguage 不在翻译表中 → 只显示英文（跳过本地语言列）

### 6.1 沟通短语翻译表

```typescript
const COMM_PHRASES: Record<CommunicationAction, Record<string, string>> = {
  sold_out: {
    en: 'Sold out', zh: '没有了', th: 'ไม่มี', ja: '売り切れ',
    ko: '품절', fr: 'Épuisé', es: 'Agotado', it: 'Esaurito', de: 'Ausverkauft',
  },
  change: {
    en: 'Change this', zh: '换一道', th: 'เปลี่ยน', ja: '変更',
    ko: '변경', fr: 'Changer', es: 'Cambiar', it: 'Cambiare', de: 'Ändern',
  },
  add_more: {
    en: 'One more', zh: '加一份', th: 'เพิ่ม', ja: 'もう一つ',
    ko: '추가', fr: 'Encore un', es: 'Uno más', it: 'Ancora uno', de: 'Noch eins',
  },
  other: {
    en: 'Other question', zh: '其他问题', th: 'อื่นๆ', ja: 'その他',
    ko: '기타', fr: 'Autre', es: 'Otro', it: 'Altro', de: 'Sonstiges',
  },
};
```


### 6.2 翻译表维护策略

**MVP 覆盖范围**：top 5 语言 — th（泰语）、ja（日语）、ko（韩语）、zh（中文）、en（英语）

**维护流程**：
1. AI 批量生成初始翻译（覆盖全部 19 项 × 5 语言 = 95 条目）
2. 过敏原术语需人工校验（涉及安全，不能纯依赖 AI）
3. 其余语言（fr/es/it/de 等）标注 TBD，降级为英文显示

**完整翻译条目清单**（19 项 × 5 语言 = 95 条目）：

| 类别 | 条目 | en | th | ja | ko | zh |
|------|------|----|----|----|----|-----|
| 过敏原 | peanut | Peanut allergy | ไม่ทานถั่ว | ピーナッツアレルギー | 땅콩 알레르기 | 花生过敏 |
| 过敏原 | shellfish | Shellfish allergy | แพ้อาหารทะเลมีเปลือก | 甲殻類アレルギー | 갑각류 알레르기 | 甲壳类过敏 |
| 过敏原 | dairy | Dairy allergy | แพ้นม | 乳製品アレルギー | 유제품 알레르기 | 乳制品过敏 |
| 过敏原 | gluten | Gluten allergy | แพ้กลูเตน | グルテンアレルギー | 글루텐 알레르기 | 麸质过敏 |
| 过敏原 | tree_nut | Tree nut allergy | แพ้ถั่วเปลือกแข็ง | ナッツアレルギー | 견과류 알레르기 | 坚果过敏 |
| 过敏原 | egg | Egg allergy | แพ้ไข่ | 卵アレルギー | 달걀 알레르기 | 鸡蛋过敏 |
| 过敏原 | soy | Soy allergy | แพ้ถั่วเหลือง | 大豆アレルギー | 대두 알레르기 | 大豆过敏 |
| 过敏原 | fish | Fish allergy | แพ้ปลา | 魚アレルギー | 생선 알레르기 | 鱼类过敏 |
| 禁忌 | vegetarian | Vegetarian | มังสวิรัติ | ベジタリアン | 채식주의 | 素食 |
| 禁忌 | halal | Halal only | ฮาลาล | ハラール | 할랄 | 清真 |
| 禁忌 | vegan | Vegan | วีแกน | ヴィーガン | 비건 | 纯素 |
| 沟通短语 | sold_out | Sold out | ไม่มี | 売り切れ | 품절 | 没有了 |
| 沟通短语 | change | Change this | เปลี่ยน | 変更 | 변경 | 换一道 |
| 沟通短语 | add_more | One more | เพิ่ม | もう一つ | 추가 | 加一份 |
| 沟通短语 | other | Other question | อื่นๆ | その他 | 기타 | 其他问题 |
| 确认短语 | confirm_soldout | {dish} - Sold out | {dish} ไม่มี | {dish} 売り切れ | {dish} 품절 | {dish} 没有了 |
| 确认短语 | confirm_change | Please recommend other | ช่วยแนะนำอย่างอื่น | 他のおすすめは？ | 다른 추천 부탁 | 请推荐其他菜 |
| 确认短语 | confirm_addmore | One more {dish} | เพิ่ม {dish} | {dish} もう一つ | {dish} 추가 | 再来一份 {dish} |
| 确认短语 | confirm_other | Question about {dish} | สอบถามเกี่ยวกับ {dish} | {dish}について質問 | {dish} 관련 질문 | 关于 {dish} 的问题 |

---

## 7. 集成点

| 文件 | 修改内容 |
|------|---------|
| `shared/types.ts` | 新增 AllergenMatchResult、AllergyBannerData、CommunicationAction 类型 |
| `app/src/views/WaiterModeView.tsx` | 添加 AllergyBanner 渲染 + 菜品行点击 → DishCommunicationPanel + 进入前过敏检查逻辑 |
| `app/src/components/WaiterAllergyBanner.tsx` | **新建** |
| `app/src/components/AllergenWarningSheet.tsx` | **新建** |
| `app/src/components/DishCommunicationPanel.tsx` | **新建** |
| `app/src/utils/allergenMapping.ts` | **新建**：检查 Order 菜品 vs 用户过敏原的匹配逻辑 |
| `app/src/utils/localLanguage.ts` | **新建**：过敏原/沟通短语的多语言翻译表 |
| `app/src/context/AppContext.tsx` | Order→Waiter 导航时增加过敏检查拦截（或在 WaiterModeView mount 时检查）|
| `app/src/views/ExploreView.tsx` | 「展示给服务员」按钮路径也需触发过敏检查 |

---

## 8. 边界与错误恢复

| 场景 | 处理 |
|------|------|
| 用户无过敏原声明 | AllergyBanner 不显示，WarningSheet 不弹出 |
| 用户有过敏原但 Order 无匹配 | Banner 仍显示（提醒服务员），Sheet 不弹出 |
| detectedLanguage 不在翻译表中 | 降级只显示英文，跳过本地语言 |
| 沟通面板「没有了」后 Order 变空 | 提示"点菜单已空，需要继续加菜吗？"→ Chat/Explore |
| 多种过敏原 | Banner 逐行列出每种，Sheet 列出所有匹配菜品 |
| allergens 字段为 uncertain=true | Sheet 中标注"可能含有"而非"含有" |
| 服务员确认后用户取消操作 | 大字确认屏有「← 返回」按钮，可回到选项面板 |
