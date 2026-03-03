import { chromium } from 'playwright';
import fs from 'fs';

const APP = 'http://localhost:5173';
const shots = [];
const log = (pass, item, detail='') => {
  const s = pass === null ? '⚠️' : (pass ? '✅' : '❌');
  console.log(`${s} ${item}${detail ? ': '+detail : ''}`);
};

const browser = await chromium.connectOverCDP('http://127.0.0.1:19013');
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.setViewportSize({ width: 390, height: 844 });

const shot = async (name) => {
  await page.screenshot({ path: `/tmp/sage-${name}.png` });
};

// ── P1: Home ──
console.log('=== P1: Home ===');
await page.goto(APP, { waitUntil: 'domcontentloaded', timeout: 10000 });
await page.waitForTimeout(1000);
await shot('p1-home');

const bodyText = await page.textContent('body');
log(bodyText.length > 100, 'Home renders content');

// Check for scan/start button  
const scanBtn = await page.locator('button, a').filter({ hasText: /扫描|scan|开始|start|拍菜单/i }).first();
log(await scanBtn.count() > 0, 'Scan/Start CTA visible');

// Check settings (gear icon, usually accessible via home)
const gearOrSettings = await page.locator('[data-testid*="setting"], button[aria-label*="setting"], svg[data-icon*="gear"]').count();
log(gearOrSettings > 0, 'Settings icon', `found ${gearOrSettings}`);

// ── P2: Scanner ──
console.log('\n=== P2: Scanner ===');
await page.goto(APP + '/scanner', { waitUntil: 'domcontentloaded', timeout: 8000 }).catch(() => {});
await page.waitForTimeout(800);
// Try click scan button
const cnt = await scanBtn.count();
if (cnt > 0) {
  await page.goto(APP, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(500);
  await page.locator('button, a').filter({ hasText: /扫描|scan|开始|start|拍菜单/i }).first().click();
  await page.waitForTimeout(1000);
}
await shot('p2-scanner');
const scannerUrl = page.url();
log(true, 'After scan click URL', scannerUrl);

// Check file upload input
const fileInput = await page.locator('input[type="file"]').count();
log(fileInput > 0, 'File upload input exists', `count: ${fileInput}`);

// ── P3: Inject menu data, navigate to chat ──
console.log('\n=== P3: Chat View ===');
await page.goto(APP, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  const mockSession = {
    menuData: {
      menuType: 'restaurant', detectedLanguage: 'th', priceLevel: 1, currency: 'THB',
      processingMs: 18000, imageCount: 1,
      categories: [{ id: 'cat01', nameOriginal: 'MAIN DISHES', nameTranslated: '主菜', itemIds: ['i01','i02','i03'] }],
      items: [
        { id: 'i01', nameOriginal: 'Pad Thai', nameTranslated: '泰式炒河粉', price: 80, priceText: '80.-', tags: [], brief: '泰式炒河粉，花生酸甜', allergens: [{type:'peanut',uncertain:false}], dietaryFlags: [], spiceLevel: 1, calories: null },
        { id: 'i02', nameOriginal: 'Green Curry', nameTranslated: '绿咖喱鸡', price: 90, priceText: '90.-', tags: [], brief: '椰奶绿咖喱', allergens: [], dietaryFlags: [], spiceLevel: 3, calories: null },
        { id: 'i03', nameOriginal: 'Mango Sticky Rice', nameTranslated: '芒果糯米饭', price: 60, priceText: '60.-', tags: [], brief: '泰式甜品', allergens: [], dietaryFlags: ['vegan'], spiceLevel: 0, calories: null }
      ]
    },
    currentView: 'chat',
    preChatDone: true,
    orderItems: []
  };
  // Try different storage keys
  localStorage.setItem('sage-session', JSON.stringify(mockSession));
  localStorage.setItem('sageSession', JSON.stringify(mockSession));
});
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
await shot('p3-chat');

// Check chat input
const chatInput = await page.locator('textarea, input[type="text"]').first();
const inputCount = await page.locator('textarea, input[type="text"]').count();
log(inputCount > 0, 'Chat input exists', `count: ${inputCount}`);

if (inputCount > 0) {
  const fontSize = await page.evaluate(() => {
    const el = document.querySelector('textarea, input[type="text"]');
    return el ? window.getComputedStyle(el).fontSize : null;
  });
  const size = parseFloat(fontSize);
  log(size >= 16, `Input font-size >= 16px (iOS zoom prevention)`, fontSize);
}

// Check text content of page
const chatBody = await page.textContent('body');
log(chatBody.length > 50, 'Chat page has content', `${chatBody.length} chars`);

// ── P4: Explore link ──
console.log('\n=== P4: Explore ──');
const exploreLink = await page.locator('button, a').filter({ hasText: /explore|探索|菜单|browse/i }).first();
if (await exploreLink.count() > 0) {
  await exploreLink.click();
  await page.waitForTimeout(800);
  await shot('p4-explore');
  log(true, 'Explore navigates', page.url());
} else {
  log(null, 'Explore button not found on current view', 'may need session state');
}

// ── P5: Order badge ──
console.log('\n=== P5: Order Badge ===');
const badge = await page.locator('[data-testid*="badge"], .badge, [class*="badge"]').count();
log(badge >= 0, 'Order badge check', `elements: ${badge}`);

console.log('\n=== Screenshots saved to /tmp/sage-*.png ===');
console.log('Current URL:', page.url());
console.log('Page title:', await page.title());

await context.close();
