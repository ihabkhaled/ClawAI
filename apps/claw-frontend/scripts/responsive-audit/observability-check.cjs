// Proves the portal shell never scrolls as a document on /observability (rule 62).
const { chromium } = require('@playwright/test');
const LOCAL = 'http://127.0.0.1:3999';
const BACKEND = 'https://claw.local';
const SIZES = [[1440, 900], [2540, 1250], [390, 844]];

async function main() {
  const browser = await chromium.launch();
  let bad = 0;
  for (const [width, height] of SIZES) {
    const context = await browser.newContext({ viewport: { width, height }, ignoreHTTPSErrors: true });
    await context.route('**/api/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const response = await route.fetch({ url: `${BACKEND}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    });
    const page = await context.newPage();
    await page.goto(`${LOCAL}/en/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('admin@claw.local');
    await page.getByLabel('Password', { exact: true }).fill('ClawAdmin123!');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.waitForURL(/\/en\/(dashboard|chat)/, { timeout: 60000 });
    await page.goto(`${LOCAL}/en/observability`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(4000);
    const tabs = await page.getByRole('tab').all();
    for (let i = 0; i <= tabs.length; i += 1) {
      if (i > 0) await tabs[i - 1].click();
      await page.waitForTimeout(1500);
      await page.locator('main').evaluate((el) => el.scrollTo(0, el.scrollHeight));
      for (let k = 0; k < 15; k += 1) await page.keyboard.press('Tab');
      const m = await page.evaluate(() => ({
        sh: document.documentElement.scrollHeight,
        ih: window.innerHeight,
        sy: window.scrollY,
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      const ok = m.sh <= m.ih + 1 && m.sy === 0 && m.sw <= m.cw + 1;
      if (!ok) bad += 1;
      console.log(ok ? 'ok  ' : 'FAIL', `${width}x${height} tab#${i}`, JSON.stringify(m));
    }
    await page.screenshot({ path: `D:/Freelance/Claw/apps/claw-frontend/scripts/responsive-audit/out/observability-${width}.png` });
    await context.close();
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
}

main().catch((e) => {
  console.log('ERR', String(e.message).slice(0, 300));
  process.exit(1);
});
