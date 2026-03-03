# SAGE 验收测试手册 — E2E 自动化执行指南

> **版本**: v1.0 | **日期**: 2026-03-03  
> **环境**: https://sage-next-gen.pages.dev  
> **工具**: OpenClaw browser tool（profile=openclaw）  
> **Fixtures 目录**: `tests/fixtures/`

---

## 一、JS 文件注入模板

在浏览器中模拟文件上传时，使用以下 JS 代码（通过 `browser action=act + evaluate`）：

```javascript
// 通用文件上传注入模板
async function injectMenuFile(base64Data, mimeType = 'image/jpeg', fileName = 'menu.jpg') {
  const byteString = atob(base64Data);
  const byteArray = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    byteArray[i] = byteString.charCodeAt(i);
  }
  const blob = new Blob([byteArray], { type: mimeType });
  const file = new File([blob], fileName, { type: mimeType });
  const input = document.querySelector('input[type="file"]');
  if (!input) throw new Error('No file input found');
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(file);
  Object.defineProperty(input, 'files', { value: dataTransfer.files });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return 'injected: ' + fileName;
}
```

### 从本地文件转 base64（Node.js）

```bash
node -e "console.log(require('fs').readFileSync('tests/fixtures/menu-thai-01.jpg').toString('base64'))" | pbcopy
```

---

## 二、7 步主线测试流程（标准步骤）

| 步 | 操作 | 验证点 |
|----|------|--------|
| S1 | 打开首页 | 上传区/拍照按钮可见 |
| S2 | 注入文件上传 | loading 动画出现，无报错弹窗 |
| S3 | 等待识别完成 | 菜品列表出现，≥3 道菜 |
| S4 | Explore 视图 | 分类正确，菜品名各不相同 |
| S5 | AI 对话 | 回复引用菜单菜品，< 15s |
| S6 | 加入订单 | Order 显示独立条目 |
| S7 | 截图归档 | 保存关键状态截图 |

---

## 三、TC-001 泰餐菜单主线测试

**图片**: `fixtures/menu-thai-01.jpg`（泰文鱼类菜单）  
**备用**: `menu-thai-02.jpg`, `menu-thai-03.jpg`

### S1 — 打开首页
```
browser action=navigate url="https://sage-next-gen.pages.dev"
browser action=screenshot
```
断言: 上传按钮或相机图标可见

### S2 — 注入菜单图片
```
browser action=act request={
  "kind": "evaluate",
  "fn": "/* 调用 injectMenuFile(BASE64, 'image/jpeg', 'menu-thai-01.jpg') */"
}
```
断言: loading/spinner 出现，无错误提示

### S3 — 等待识别
```
browser action=act request={"kind":"wait","textGone":"识别中","timeMs":30000}
browser action=screenshot
```
断言:
- 出现 ≥3 道菜品
- 菜品名含泰文字符或泰式食物词汇
- 价格字段非空

### S4 — Explore 视图（BUG-001 检查点）
```
browser action=act request={"kind":"click","ref":"Explore 标签"}
browser action=snapshot
browser action=screenshot
```
断言:
- ≥2 个分类
- **每个菜品名称各不相同**（BUG-001 防回归）
- 各菜品价格各不相同

```javascript
// 验证代码
const cards = document.querySelectorAll('[data-testid="dish-card"],[class*="DishCard"],[class*="dish-card"]');
const names = Array.from(cards).map(c => c.querySelector('h2,h3,[class*="name"]')?.textContent?.trim()).filter(Boolean);
const unique = new Set(names);
return { total: names.length, unique: unique.size, pass: unique.size === names.length };
```

### S5 — AI 对话
```
browser action=act request={"kind":"type","ref":"聊天输入框","text":"推荐一道适合怕辣的游客的菜","submit":true}
browser action=act request={"kind":"wait","textGone":"thinking","timeMs":20000}
browser action=screenshot
```
断言: AI 回复包含菜单上的菜品名

### S6 — 加入订单（BUG-002 检查点）
```
browser action=act request={"kind":"click","ref":"第一道菜加入按钮"}
browser action=act request={"kind":"click","ref":"第二道菜加入按钮"}
browser action=act request={"kind":"click","ref":"Order 标签"}
browser action=screenshot
```
断言:
- Order 中有 **2 个独立条目**，名称各不相同（BUG-002 防回归）
- 总价 = 两菜价格之和

```javascript
const items = document.querySelectorAll('[class*="OrderItem"],[data-testid="order-item"]');
const names = Array.from(items).map(i => i.querySelector('[class*="name"]')?.textContent?.trim());
return { count: items.length, names, pass: items.length >= 2 && new Set(names).size === names.length };
```

### S7 — 全页截图归档
```
browser action=screenshot fullPage=true
```

---

## 四、TC-002 日料居酒屋菜单

**图片**: `fixtures/menu-japanese-01.jpg`

关键断言：
- S3: 识别出日文菜名（含仮名字符）；酒水类被识别
- S4: 菜品按料理/酒水分类
- S5: AI 对话 `"有什么啤酒推荐？"` → 回复引用菜单酒水条目
- S6: 菜品名无乱码，数量 ×1

---

## 五、TC-003 西班牙语海鲜菜单

**图片**: `fixtures/menu-spanish-01.jpg`, `fixtures/menu-spanish-02.jpg`

关键断言：
- S3: 识别出西班牙语菜品（含 mariscos/pescado 等词）
- S4: 菜品显示用户语言翻译
- S5: 对话 `"Which dishes are safe for shellfish allergy?"` → AI 英文回复，明确提及/排除贝类

---

## 六、TC-004 中餐菜单

**图片**: `fixtures/menu-chinese-01.jpg`

关键断言：
- S3: 菜品含凉菜/热菜/汤类分区，价格单位 ¥
- S4: 分区信息在 Explore 中可见
- S5: 对话 `"有适合素食者的菜吗？"` → AI 筛选素食菜品

---

## 七、TC-005 葡萄牙语过敏源菜单

**图片**: `fixtures/menu-portuguese-01.jpg`（Coentro 餐厅）

关键断言：
- S3: 过敏源标注（allergen icons）被提取到菜品字段
- S5: 对话 `"Which dishes contain gluten?"` → 准确回答
- S6: 含过敏源的菜品在加入订单时有提示

---

## 八、回归测试 BUG-001 ~ BUG-004

### BUG-001: Explore 菜品去重

```javascript
// 在 Explore 页执行
const cards = document.querySelectorAll('[data-testid="dish-card"],[class*="DishCard"]');
const names = Array.from(cards).map(c => c.querySelector('h2,h3,[class*="name"]')?.textContent?.trim());
const unique = new Set(names);
const pass = unique.size === names.length;
console.assert(pass, 'BUG-001 FAIL: 发现重复菜品', names);
return { total: names.length, unique: unique.size, pass };
```
**通过条件**: `unique.size === names.length`

---

### BUG-002: Order 条目独立性

```javascript
// 在 Order 页执行（已加入2道不同菜品后）
const items = document.querySelectorAll('[class*="OrderItem"],[data-testid="order-item"]');
const names = Array.from(items).map(i => i.querySelector('[class*="name"]')?.textContent?.trim());
const pass = items.length >= 2 && new Set(names).size === names.length;
console.assert(pass, 'BUG-002 FAIL: Order 条目重复或合并', names);
return { count: items.length, names, pass };
```
**通过条件**: 2个独立条目，名称各不相同

---

### BUG-003: MealPlan 替换后更新

**步骤**:
1. 触发 AI 生成 MealPlanCard（发送"帮我规划今天的用餐"）
2. 点击 MealPlanCard 上的替换按钮
3. 等待 AI 回复（30s）

```javascript
// 验证新 MealPlanCard 出现
const cards = document.querySelectorAll('[class*="MealPlanCard"],[data-testid="meal-plan-card"]');
const deprecated = document.querySelectorAll('[class*="deprecated"],[data-deprecated]');
return { totalCards: cards.length, deprecated: deprecated.length, pass: cards.length >= 1 };
```
**通过条件**: 新 MealPlanCard 出现，旧卡片标记过期

---

### BUG-004: Explore 数量独立于 Order

**步骤**:
1. 在 Order 加入菜品 A 数量 ×2
2. 返回 Explore 视图
3. 执行以下验证

```javascript
const quantityBadges = document.querySelectorAll('[class*="quantity-badge"],[data-testid="qty"],[class*="CountBadge"]');
const nonZero = Array.from(quantityBadges).filter(b => parseInt(b.textContent || '0') > 0);
const pass = nonZero.length === 0;
console.assert(pass, 'BUG-004 FAIL: Explore 显示 Order 数量', nonZero.map(b => b.textContent));
return { nonZeroCount: nonZero.length, pass };
```
**通过条件**: Explore 中无数量角标，或全部为 0

---

## 九、冒烟测试清单（< 5 分钟）

```
□ 首页正常加载，无 console error
□ 上传 menu-thai-01.jpg → 识别结果出现
□ Explore 菜品名各不相同（BUG-001）
□ 加入2道菜 → Order 显示2个独立条目（BUG-002）
□ AI 对话回复正常（< 15s）
□ 移动端布局正常（390×844）
```

---

## 十、截图命名规范

```
tc{编号}-s{步骤}-{描述}.png     e.g. tc001-s4-explore.png
bug{编号}-{pass|fail}.png       e.g. bug001-regression-pass.png
```

保存路径: `tests/screenshots/YYYY-MM-DD/`

---

## 十一、执行记录模板

| 用例 | 状态 | 图片 | 备注 |
|------|------|------|------|
| TC-001 泰餐 | ✅/❌ | menu-thai-01.jpg | |
| TC-002 日料 | ✅/❌ | menu-japanese-01.jpg | |
| TC-003 西班牙语 | ✅/❌ | menu-spanish-01.jpg | |
| TC-004 中餐 | ✅/❌ | menu-chinese-01.jpg | |
| TC-005 葡语过敏源 | ✅/❌ | menu-portuguese-01.jpg | |
| BUG-001 回归 | ✅/❌ | — | |
| BUG-002 回归 | ✅/❌ | — | |
| BUG-003 回归 | ✅/❌ | — | |
| BUG-004 回归 | ✅/❌ | — | |
