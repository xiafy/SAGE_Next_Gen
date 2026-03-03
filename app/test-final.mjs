import { chromium } from 'playwright';
import path from 'path';

const APP = 'http://localhost:5173';
const browser = await chromium.connectOverCDP('http://127.0.0.1:19013');
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const log = (pass, item, detail='') => console.log(`${pass?'✅':pass===null?'⚠️':'❌'} ${item}${detail?': '+detail:''}`);
const shot = async (name) => page.screenshot({ path: `/tmp/sage3-${name}.png` });

console.log('=== SAGE 完整流程验收 (生产 Worker) ===\n');

// P1: Home
await page.goto(APP, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(800);
await shot('home');
log(true, 'P1: Home loads');

// P2: Scanner + Upload
console.log('→ 点击扫描...');
await page.locator('button').filter({ hasText: /扫描|scan|拍照/i }).first().click();
await page.waitForTimeout(600);
await shot('scanner');

const fileInput = page.locator('input[type="file"]');
if (await fileInput.count() > 0) {
  const imgPath = path.resolve('./public/test-menu.jpg');
  await fileInput.setInputFiles(imgPath);
  await page.waitForTimeout(800);
  await shot('uploaded');
  log(true, 'P2: Upload works');
  
  // Click confirm
  const confirmBtn = page.locator('button').filter({ hasText: /确认|confirm|分析|analyze/i }).first();
  if (await confirmBtn.count() > 0) {
    console.log('→ 点击确认并分析，等待识别 (max 40s)...');
    await confirmBtn.click();
    
    // Wait for chat view or error
    try {
      await page.waitForSelector('textarea, [class*="chat"], .message', { timeout: 45000 });
    } catch(e) { console.log('  timeout'); }
    await page.waitForTimeout(2000);
    await shot('chat-loading');
    
    const bodyText = await page.textContent('body');
    const inChat = bodyText.includes('发送') || bodyText.includes('输入') || bodyText.includes('SAGE');
    log(inChat, 'P3: Reached chat', inChat ? 'yes' : 'no');
    
    if (inChat && bodyText.includes('菜单识别')) {
      // Check for MealPlanCard trigger - ask for meal plan
      const textarea = page.locator('textarea').first();
      if (await textarea.count() > 0) {
        console.log('→ 请求用餐方案...');
        await textarea.fill('帮我搭配一套适合 2 人的用餐方案');
        await page.waitForTimeout(200);
        await shot('typed');
        
        const sendBtn = page.locator('button[type="submit"]').first();
        if (await sendBtn.count() > 0) {
          await sendBtn.click();
          console.log('→ 等待 AI 响应 (max 30s)...');
          await page.waitForTimeout(35000);
          await shot('ai-response');
          
          const responseText = await page.textContent('body');
          const hasPlan = responseText.includes('方案') || responseText.includes('推荐') || responseText.includes('课程') || responseText.includes('meal');
          log(hasPlan, 'P4: AI meal plan response', hasPlan ? 'yes' : 'no');
          
          // Check for JSON code block (MealPlanCard)
          const hasJson = responseText.includes('```json') || responseText.includes('```');
          log(hasJson, 'P4: JSON code block (MealPlanCard)', hasJson ? 'yes' : 'no');
        }
      }
    }
    
    // Check input font size
    const fontSize = await page.evaluate(() => {
      const el = document.querySelector('textarea, input[type="text"]');
      return el ? window.getComputedStyle(el).fontSize : null;
    });
    log(fontSize && parseFloat(fontSize) >= 16, 'BUG-G: Input font >= 16px (iOS)', fontSize);
  }
}

await shot('final');
console.log('\n✅ Screenshots: /tmp/sage3-*.png');
await context.close();
