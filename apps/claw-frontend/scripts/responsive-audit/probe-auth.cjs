// Usage: node probe-auth.cjs <path> <width> -- logged-in (admin) variant of probe-wide: deepest elements past the right edge, clipped or not.
const { chromium } = require('@playwright/test');
(async () => {
  const [path, w = '768'] = process.argv.slice(2);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: +w, height: 1000 }, ignoreHTTPSErrors: true });
  await ctx.route('**/api/v1/**', async (route) => {
    const u = new URL(route.request().url());
    const response = await route.fetch({ url: `https://claw.local${u.pathname}${u.search}` });
    await route.fulfill({ response });
  });
  const p = await ctx.newPage();
  await p.goto('http://127.0.0.1:3999/en/login');
  await p.locator('input[type=email]').first().fill('admin@claw.local');
  await p.locator('input[type=password]').first().fill('ClawAdmin123!');
  await p.locator('button[type=submit]').first().click();
  await p.waitForURL(/\/(dashboard|chat)/, { timeout: 60000 });
  await p.goto(`http://127.0.0.1:3999${path}`, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const out = await p.evaluate((vw) => {
    const res = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1) {
        if (!Array.from(el.children).some((c) => c.getBoundingClientRect().right > vw + 1)) {
          res.push(`${el.tagName}.${String(el.className).slice(0, 90)} r=${Math.round(r.right)} w=${Math.round(r.width)} :: ${(el.textContent || '').trim().slice(0, 30)}`);
        }
      }
    }
    return [`docSW ${document.documentElement.scrollWidth}`, ...res.slice(0, 15)];
  }, +w);
  console.log(out.join('\n'));
  await b.close();
})();
