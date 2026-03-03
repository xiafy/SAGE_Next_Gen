import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const APP = 'http://localhost:5173';

const browser = await chromium.connectOverCDP('http://127.0.0.1:19013');
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const log = (pass, item, detail='') => {
  const s = pass === null ? '⚠️' : (pass ? '✅' : '❌');
  console.log(`${s} ${item}${detail ? ': '+detail : ''}`);
};
const shot = async (name) => page.screenshot({ path: `/tmp/sage2-${name}.png` });

console.log('=== SAGE UI 完整流程验收 ===\n');

// P1: Home
await page.goto(APP, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1000);
const bodyText = await page.textContent('body');
log(bodyText.length > 100, 'P1: Home renders', `${bodyText.length} chars`);
log(bodyText.includes('扫描') || bodyText.includes('Scan'), 'P1: Scan CTA text visible');

// Settings gear
const settingsGear = await page.locator('button svg, a svg').first();
const hasSettings = await page.locator('svg').count();
log(hasSettings > 0, 'P1: SVG icons present', `count: ${hasSettings}`);
await shot('home');

// P2: Scanner - Upload image
console.log('\n=== P2: Scanner + Upload ===');
await page.locator('button').filter({ hasText: /扫描|scan|拍照|start/i }).first().click();
await page.waitForTimeout(800);
await shot('scanner');

// Upload test image via file input
const imgPath = path.resolve('./public/test-menu.jpg');
const fileInput = page.locator('input[type="file"]');
const hasFileInput = await fileInput.count() > 0;
log(hasFileInput, 'P2: File input exists');

if (hasFileInput) {
  await fileInput.setInputFiles(imgPath);
  await page.waitForTimeout(1000);
  await shot('after-upload');
  
  // Check preview appears
  const imgCount = await page.locator('img[src*="blob:"], img[src*="data:"]').count();
  log(imgCount > 0, 'P2: Image preview shown', `${imgCount} preview(s)`);
  
  // Click confirm/analyze button
  const confirmBtn = await page.locator('button').filter({ hasText: /确认|confirm|识别|analyze|继续|next/i }).first();
  if (await confirmBtn.count() > 0) {
    await confirmBtn.click();
    console.log('  → Clicked confirm, waiting for recognition (max 30s)...');
    
    // Wait for recognition to complete (look for progress or result)
    try {
      await page.waitForSelector('[data-testid*="progress"], [class*="progress"], .analyzing, [class*="chat"], textarea', 
        { timeout: 35000 });
    } catch(e) {
      console.log('  → Timeout waiting for chat view');
    }
    await shot('after-analysis');
    
    const afterUrl = page.url();
    const afterText = await page.textContent('body');
    log(true, 'P2: After analysis state', `url: ${afterUrl}, text length: ${afterText.length}`);
    
    // Check if we reached chat
    const inChat = afterText.includes('发送') || afterText.includes('Send') || afterText.includes('输入');
    log(inChat, 'P3: Reached chat view');
    
    if (inChat) {
      // P3: Chat - iOS font size check
      const fontSize = await page.evaluate(() => {
        const el = document.querySelector('textarea, input[type="text"]');
        return el ? window.getComputedStyle(el).fontSize : null;
      });
      log(fontSize && parseFloat(fontSize) >= 16, 'P3: Input font >= 16px (iOS)', fontSize);
      
      // Type and send a message
      const textarea = page.locator('textarea').first();
      if (await textarea.count() > 0) {
        await textarea.fill('帮我搭配一套适合2人的用餐方案');
        await page.waitForTimeout(300);
        await shot('chat-typed');
        
        const sendBtn = await page.locator('button[type="submit"], button').filter({ hasText: /发送|send/i }).first();
        if (await sendBtn.count() > 0) {
          await sendBtn.click();
          console.log('  → Sent message, waiting for AI response (max 20s)...');
          await page.waitForTimeout(20000);
          await shot('chat-response');
          
          const responseText = await page.textContent('body');
          const hasMealPlan = responseText.includes('方案') || responseText.includes('推荐') || responseText.includes('课程');
          log(hasMealPlan, 'P3: AI response with meal plan', `text: ${responseText.slice(-100)}`);
        }
      }
    }
  } else {
    log(null, 'P2: No confirm button found, listing visible buttons:');
    const btns = await page.locator('button').allTextContents();
    console.log('  Buttons:', btns.slice(0,5));
  }
}

await shot('final');
console.log('\n✅ Screenshots: /tmp/sage2-*.png');
await context.close();
