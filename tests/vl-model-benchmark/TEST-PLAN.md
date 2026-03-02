# SAGE VL 模型基准测试方案

**版本**: v1.0  
**制定日期**: 2026-03-02  
**制定人**: SAGE Agent + Mr. Xia  
**状态**: 待执行

---

## 一、测试目标

在严格控制变量的条件下，系统评估候选 VL 模型在 SAGE 菜单识别场景下的**速度**与**质量**，为模型选型提供可信数据支撑。

> ⚠️ 此前测试结论已作废——提示词、图片、评估标准均不统一，不可作为决策依据。

---

## 二、控制变量原则

| 变量 | 控制方式 |
|------|---------|
| 提示词 | 所有模型使用同一套 System + User Prompt（见第四节） |
| 测试图片 | 所有模型使用同一组 3 张图片（见第三节） |
| 参数 | temperature=0，max_tokens=4096，stream=false |
| 测试时间 | 同一模型的多次调用间隔 ≥5s，不同模型间隔 ≥10s |
| 评估标准 | 统一 ground truth（见第三节），统一评分维度（见第五节） |

---

## 三、测试图片与 Ground Truth

### 图片 A：美式海鲜菜单（`menu-us-seafood.jpg`）

- **语言**: 英语  
- **菜系**: 美式海鲜
- **约 32 道菜**，含 Tacos / Burgers / Grilled & Baked / Fried / Pasta 等分类  
- **货币**: USD，格式 `XX.99`，部分 MKT（市价）
- **过敏原标注**: 无数字编码，仅标注 GF（无麸质），需靠 AI 食品知识推理

**关键 Ground Truth（价格精确验证）**：

| 菜品 | 价格 | 已知过敏原（食品知识推理） |
|------|------|--------------------------|
| Jaco Tacos | 18.99 | fish(mahi), gluten(tortilla), egg(aioli) |
| Jerk Shrimp Tacos | 18.99 | shellfish, gluten(tortilla), dairy(coconut aioli≈无乳，注意) |
| Lobster BLT Tacos | 29.99 | shellfish(lobster), gluten(tortilla), egg(aioli) |
| Fish N' Chips | 26.99 | fish(cod), gluten(beer batter) |
| The Captain's | 56.99 | shellfish(shrimp/scallops/oysters), fish, gluten |
| Lobster Mac | 36.99 | shellfish(lobster), gluten(macaroni), dairy(béchamel+cheese) |
| Crab Stuffed Shrimp | 30.99 | shellfish(crab+shrimp) |
| Whole Maine Lobster | MKT | shellfish |
| Seafood Bake | 30.99 | shellfish(shrimp/clams/scallops), fish(salmon), dairy(butter) |

---

### 图片 B：西班牙高端海鲜菜单（`menu-es-seafood.jpg`）

- **语言**: 西班牙语（含英文副标题）  
- **菜系**: 西班牙高端海鲜（José Luis Romero 餐厅）
- **约 30 个品项**，含金枪鱼/生蚝/鱼子酱等
- **货币**: EUR，格式多样（`10€` / `5,50€/ud` / `21€/8ud` / `10g/21€·20g/39€`）
- **过敏原标注**: 无，纯靠推理

**关键 Ground Truth**：

| 菜品 | 价格 | 已知过敏原 |
|------|------|-----------|
| Tosta de Atún Rojo Picante | 10€ | fish(tuna), gluten(bread/toast) |
| Anchoas del Cantábrico "OOO" /ud | 2,50€ | fish(anchovy) |
| Mejillones fritos en escabeche | 12,50€ | shellfish(mollusc/mussels), gluten(frying batter) |
| Zamburiñas en salsa Vieira | 12,50€ | shellfish(mollusc/scallop), dairy(sauce) |
| Ostra Gillardeau Nº2 | 5,50€/ud | shellfish(mollusc/oyster) |
| Caviar de España Baeri Premium | 21€/10g | fish(caviar/roe) |
| Gilda Anchoa/Boquerón/Picante | 2,50€ | fish(anchovy/boquerón) |

**价格提取难度**：此图价格格式最复杂，是格式测试的重点。

---

### 图片 C：COENTRO 菜单（`menu-coentro-allergens.jpg`）⭐ 主要 allergens 测试图

- **语言**: 英语
- **菜系**: 创意融合料理（加那利/葡萄牙/拉美风格）
- **18 道菜**，含 Starters / Fish / Meat / Desserts
- **货币**: EUR，整数或一位小数（如 16、27,5）
- **过敏原标注**: ✅ **有明确的 1-13 编号系统（欧盟标准）**，是 ground truth 最可靠的图片

**过敏原编号对照表（欧盟 → SAGE 字段）**：

| 编号 | 欧盟过敏原 | SAGE allergen type |
|------|-----------|-------------------|
| 1 | Cereales/Gluten（含麸质谷物） | `gluten` |
| 2 | Crustáceos（甲壳类） | `shellfish` |
| 3 | Pescado（鱼类） | `fish` |
| 4 | Moluscos（软体动物） | `shellfish` |
| 5 | Cacahuetes 或 Apio（花生/芹菜） | `peanut` 或无 |
| 6 | Lácteos（乳制品） | `dairy` |
| 7 | Huevo（鸡蛋） | `egg` |
| 8 | Sésamo（芝麻） | `sesame` |
| 9 | Frutos de cáscara（树坚果） | `tree_nut` |
| 10 | Cacahuetes（花生）→ 确认："Creamy Peanut Sauce" | `peanut` |
| 11 | Soja（大豆） | `soy` |
| 12 | Mostaza（芥末） | （SAGE 暂无此类型） |
| 13 | Sulfitos（亚硫酸盐） | （SAGE 暂无此类型） |

**完整 Ground Truth（菜单标注 + 描述双重验证）**：

| 菜品 | 价格 | 标注编号 | 期望 SAGE allergens |
|------|------|---------|---------------------|
| Tomato & Lettuce | 16 | (1,6) | gluten, dairy |
| Cod Fritter | 13 | (1,3) | gluten, fish |
| Grilled Scallops | 19 | (2,4) | shellfish, shellfish |
| "Brava" Canarian Potatoes | 15 | (2) | shellfish（疑似交叉或酱汁） |
| Braised Broccoli | 17 | (6,9) | dairy, tree_nut（含开心果+腰果） |
| Tuna-Tartar | 18 | (1,2,3,6) | gluten, shellfish, fish, dairy |
| Artichoke au Gratin | 19 | (1,6) | gluten, dairy |
| Artisan Bread | 3 | (1) | gluten |
| Fried Fish | 27.5 | (1,3) | gluten, fish |
| Moqueca Local White Fish | 35 | (3,5) | fish, + 编号5（待确认） |
| Canarian Tuna Tataki | 29 | (3,8) | fish, sesame |
| Pork Cheek | 28 | (6) | dairy |
| **Spicy Boneless Chicken Leg** | **26** | **(10)** | **peanut** ← 最重要测试点 |
| Bife de Black Angus | 30 | (6) | dairy |
| Salted Caramel | 9 | (6) | dairy |
| Dark Chocolate | 12 | (6) | dairy |
| Cheesecake | 12 | (6) | dairy |

---

## 四、统一测试提示词

**所有模型使用完全相同的 System Prompt 和 User Message，不做任何模型专属调整。**

### System Prompt（固定）

```
你是专业的菜单识别引擎。从图片中提取所有菜品信息，并基于食品知识补充安全相关字段。
只输出JSON，不要markdown，不要任何解释。

输出格式（严格遵守）：
{
  "menuType": "restaurant",
  "detectedLanguage": "en",
  "priceLevel": 2,
  "currency": "USD",
  "categories": [{"nameOriginal": "TACOS", "nameTranslated": "塔可"}],
  "items": [{
    "nameOriginal": "Fish N' Chips",
    "nameTranslated": "炸鱼薯条",
    "priceText": "26.99",
    "category": "BATTERED & FRIED",
    "brief": "啤酒面衣炸鳕鱼配薯条，外酥内嫩",
    "briefDetail": "英式经典街头小吃，酥脆啤酒面衣包裹鳕鱼",
    "allergens": [{"type": "fish", "uncertain": false}, {"type": "gluten", "uncertain": false}],
    "dietaryFlags": [],
    "spiceLevel": 0
  }]
}

规则：
【菜品识别】
- 覆盖图片中所有可读菜品；每个独立可点单的选项单独一条（猪肉/鸡肉/虾/素食各一条）
- priceText: 严格复制原文价格（包括货币符号、格式），禁止编造；如为市价写"MKT"

【翻译】
- nameTranslated: 翻译为中文；categories 的 nameTranslated 也必须翻译为中文
- brief: 主要食材+口味，≤20字中文
- briefDetail: 文化背景或类比，≤40字中文

【过敏原】（最高优先级）
- allergens: 综合两种来源判断：
  ① 菜单图片上的明确标注（数字编号、符号、文字说明）→ uncertain: false
  ② 基于菜品名称和配料的食品知识推理 → uncertain: true（"可能含有"）
- allergen type 只选: peanut / shellfish / fish / gluten / dairy / egg / soy / tree_nut / sesame
- 宁可多标 uncertain:true，不可漏标已知高风险过敏原
- dietaryFlags 只选: halal / vegetarian / vegan / raw / contains_alcohol
- spiceLevel: 0-5（0=不辣/未知，5=极辣）
```

### User Message（固定）

```
识别这张菜单图片，按规则输出完整JSON。用户语言：中文
```

---

## 五、评估维度与评分标准

### 5.1 速度指标

| 指标 | 说明 | 测量方法 |
|------|------|---------|
| Total Time | 从发送请求到收到完整响应 | wall clock，各模型各图片各 3 次取均值 |

### 5.2 质量指标

#### Q1 — 菜品数量召回率（OCR 完整性）
- 评分：`识别菜品数 / ground truth 菜品数`
- 通过标准：≥ 85%

#### Q2 — 价格准确率
- 评分：`价格完全匹配数 / ground truth 价格数`
- "完全匹配"：priceText 与图片原文一致（含货币符号、格式）
- 通过标准：≥ 95%（价格错误直接影响用户信任）

#### Q3 — 翻译可接受率
- 评分：人工抽查 10 道菜的 nameTranslated，判断"可接受"（意思正确，无大错误）
- 通过标准：≥ 90%

#### Q4 — Allergens 召回率（最重要）
- 仅使用图片 C（COENTRO，有明确 ground truth）
- 评分：`正确识别的过敏原数 / ground truth 过敏原总数`
- 计算方式：按 item × allergen 类型配对，missing = False Negative
- **关键测试点**：Spicy Boneless Chicken Leg → 必须识别出 `peanut`（10号=花生，描述含"Creamy Peanut Sauce"）
- 通过标准：召回率 ≥ 70%

#### Q5 — Allergens 精确率（误报率）
- 评分：`正确的过敏原标注数 / 模型输出的过敏原总标注数`
- 只统计图片 C 中有 ground truth 的 item
- 通过标准：精确率 ≥ 60%（允许一定程度的"宁可多标"）

#### Q6 — 分类质量
- 评分：分类是否被正确提取且翻译
- 通过标准：非空菜单中分类召回率 ≥ 80%，已识别分类翻译准确率 ≥ 90%

#### Q7 — 复杂价格格式处理（图片 B）
- 评分：对 `5,50€/ud`、`21€/8ud`、`10g/21€·20g/39€` 等非标准格式的提取正确率
- 通过标准：格式保留原文，不做错误解析

---

## 六、候选模型

| 模型 | 提供商 | 接入方式 | 备注 |
|------|--------|---------|------|
| `gemini-2.0-flash` | Google | API Key 直连 | 当前生产模型，基准线 |
| `qwen3-vl-flash` | 阿里云百炼 | API Key 直连 | 历史基准线 |
| `doubao-seed-1-6-vision-250815` | 火山方舟 | API Key 直连 | 待测（上次超时，需调查原因） |
| `doubao-1.5-vision-pro-250328` | 火山方舟 | 需 ep-xxx | 待开通接入点 |
| `doubao-1.5-vision-lite-250315` | 火山方舟 | 需 ep-xxx | 待开通接入点 |

> **注**：doubao-seed-2-0-mini-260215 上次测试 47s，已确认过慢，不纳入 VL 模型测试。

---

## 七、测试执行计划

### Phase 1：预检（执行测试前）
- [ ] 验证所有模型可正常调用（发一条文本消息确认 API 连通）
- [ ] 确认 doubao-seed-1-6-vision 超时原因（是模型本身还是 API 调用方式问题）
- [ ] 统计 3 张图片的 ground truth 菜品总数，作为 Q1 分母

### Phase 2：速度测试
- 每个模型 × 每张图片 × 3 次重复调用
- 记录每次 total_ms、chars_output、是否成功

### Phase 3：质量评估
- 保存每个模型对每张图片的完整 JSON 输出
- 按 Q1-Q7 维度逐一评分
- 图片 C allergens 评估需对照 ground truth 逐 item 核对

### Phase 4：综合评分
- 速度权重 40%，质量权重 60%（Q4 allergens 召回率权重最高）
- 输出推荐模型方案

---

## 八、输出物

1. `RESULTS-speed.md` — 速度测试原始数据
2. `RESULTS-quality.md` — 质量评分明细（含逐 item 对比）
3. `RESULTS-summary.md` — 综合评分 + 推荐结论
4. `raw/` — 每个模型对每张图片的完整原始 JSON 输出

---

*测试方案制定：2026-03-02 | 执行前需 Mr. Xia 确认方案无误*
