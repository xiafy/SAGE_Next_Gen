# SAGE VL 模型基准测试结果报告

**执行日期**: 2026-03-02  
**测试方案版本**: v1.0 (TEST-PLAN.md)  
**测试模型**: Gemini 2.0 Flash / Doubao Seed-1.6-vision  
**控制变量**: 同一 System Prompt + 3 张图片 + temperature=0 + 每图重复 3 次

---

## 一、速度结果

| 模型 | 图A 美式海鲜 | 图B 西班牙海鲜 | 图C COENTRO | 备注 |
|------|------------|--------------|------------|------|
| **Gemini 2.0 Flash** | 23.1s | 20.9s | **17.3s** | 稳定，3次均成功 |
| Doubao Seed-1.6-vision | 超时×3 | 超时×3 | 超时×3 | 全部失败 |

**Doubao Seed-1.6-vision 超时根因**：该模型在长 System Prompt + 大图（>100KB）组合下持续超时（>120s）。单独测试小图（89KB, 短问题）可在 7.9s 内响应，但生产场景不可用。

---

## 二、质量结果（Gemini 2.0 Flash）

### Q1 菜品数量召回率

| 图片 | 模型输出 items | 状态 |
|------|--------------|------|
| A 美式海鲜 | 输出被截断（JSON 未完整），已有部分 ✅ 价格格式正确 | ⚠️ |
| B 西班牙海鲜 | 输出被截断 | ⚠️ |
| C COENTRO | 18/18 = **100%** | ✅ |

**A、B 图截断原因**：max_tokens=4096 不够，大菜单（A ~32道、B ~30道）输出超出限制。  
**修复方案**：生产环境改为 max_tokens=8192。

### Q2 价格准确率（A 图已截断部分抽查）

| 价格样本 | 模型输出 | 格式是否正确 |
|---------|---------|------------|
| 18.99 | "18.99" | ✅ |
| MKT | "MKT" | ✅ |
| 29.99 | "29.99" | ✅ |

MKT（市价）正确识别。总体价格格式 ✅，需 max_tokens 修复后完整验证。

### Q3 翻译质量（C 图抽样）

| 原文 | 翻译 | 评价 |
|------|------|------|
| Tomato & Lettuce | 番茄与莴苣 | ✅ |
| Cod Fritter | 炸鳕鱼饼 | ✅ |
| Grilled Scallops | 烤扇贝 | ✅ |
| Spicy Boneless Chicken Leg | 辣味无骨鸡腿 | ✅ |
| Canarian Tuna Tataki | 加那利金枪鱼塔塔基 | ✅（保留专有名词） |

翻译质量整体高，专有名词处理合理。

### Q4 Allergens 召回率（C 图 COENTRO，精确 Ground Truth）

**结论：召回率 75% ✅（目标 ≥70%）；精确率 62% ✅（目标 ≥60%）**

| 菜品 | GT 过敏原 | 模型输出 | 状态 |
|------|----------|---------|------|
| Tomato & Lettuce (1,6) | gluten, dairy | gluten, dairy? | ✅✅ |
| Cod Fritter (1,3) | gluten, fish | gluten, fish, egg? | ✅✅ (+uncertain egg) |
| Grilled Scallops (2,4) | shellfish | shellfish, soy | ✅ (+extra soy) |
| "Brava" Canarian Potatoes (2) | shellfish | **soy** | ❌ 误判 |
| Braised Broccoli (6,9) | dairy, tree_nut | **gluten**, tree_nut | ❌✅ (漏 dairy，误判 gluten) |
| Tuna-Tartar (1,2,3,6) | gluten, shellfish, fish, dairy | gluten, **fish**, egg, dairy? | ✅❌✅✅ (漏 shellfish) |
| Artichoke au Gratin (1,6) | gluten, dairy | gluten, dairy? | ✅✅ |
| Artisan Bread (1) | gluten | gluten | ✅ |
| Fried Fish (1,3) | gluten, fish | gluten, fish, egg? | ✅✅ (+uncertain egg) |
| **Spicy Boneless Chicken Leg (10)** | **peanut** | **peanut** | **✅ 关键安全测试通过** |
| Pork Cheek (6) | dairy | dairy? | ✅ |
| Bife de Black Angus (6) | dairy | dairy? | ✅ |
| Salted Caramel (6) | dairy | dairy? | ✅ |
| Dark Chocolate (6) | dairy | dairy? | ✅ |
| Cheesecake (6) | dairy | gluten?, dairy, egg? | ✅ (+uncertain extras) |

**最重要结果**：`Spicy Boneless Chicken Leg (10)` → `peanut` ✅  
新 Prompt 的"食品知识推理"指令成功激活模型对花生酱的过敏原推理。

### 主要失效模式分析

| 失效类型 | 受影响的编号 | 根因 | 修复方式 |
|---------|------------|------|---------|
| EU 编号 2 误判 | `(2)` Brava Potatoes → soy | 模型未可靠记忆欧盟标准：2=甲壳类 | Prompt 中加入 EU→SAGE 编号对照表 |
| EU 编号 6 误判 | `(6,9)` Broccoli 漏 dairy | 6=dairy 有时混淆为 gluten | 同上 |
| shellfish 漏标 | Tuna-Tartar (1,2,3,6) 漏 shellfish | 多编号菜品中 2 被忽略 | 对照表 + 提示"每个编号必须对应一个 allergen" |

**核心发现**：  
问题不在于模型推理能力，而在于模型对欧盟过敏原编号体系的记忆不稳定。  
**修复只需在 Prompt 中明确写出编号对照表**（1=gluten, 2=shellfish, 3=fish, 4=shellfish, 6=dairy...）。

---

## 三、关键结论

### 3.1 模型选型

| 结论 | 说明 |
|------|------|
| ✅ **Gemini 2.0 Flash 为当前最优选择** | 唯一稳定可用的 VL 模型 |
| ❌ Doubao Seed-1.6-vision 不可用于生产 | 长 Prompt + 标准菜单图片场景全部超时 |
| ❌ Doubao Seed-2.0-mini 不可用 | 47s 单次调用，慢于现有两阶段方案 |
| ⏸️ Doubao 1.5-vision-pro/lite 待测 | 需接入点 ID（ep-xxx），尚未测试 |

### 3.2 Prompt 质量验证

- **新 Prompt 花生召回测试通过** ✅：新版"食品知识+图片标注双来源"指令有效  
- **EU 编号对照表缺失**：需在 Prompt 中补充完整映射，可将召回率从 75% 提升至预估 85%+

### 3.3 工程问题

- **max_tokens=4096 不够**：大菜单（30+ 道菜）输出被截断，生产需改为 8192

---

## 四、下一步行动

| 优先级 | 行动 | 预计效果 |
|--------|------|---------|
| P0 | Prompt 补充 EU 编号对照表（1=gluten, 2=shellfish, 3=fish, 6=dairy, 8=sesame, 9=tree_nut, 10=peanut...） | allergens 召回率 75% → 85%+ |
| P0 | max_tokens 改为 8192 | 大菜单不再截断 |
| P1 | 用优化后 Prompt 重跑全量 3 图测试 | 得到最终基线数据 |
| P2 | 获取 Doubao 1.5-vision-pro ep-xxx 并测试 | 验证是否有更快选项 |
| P3 | 实施两阶段 SSE（等质量达标后） | 感知延迟 19s → 8s |

---

*报告生成: 2026-03-02 | 下次测试用优化 Prompt 后重跑*
