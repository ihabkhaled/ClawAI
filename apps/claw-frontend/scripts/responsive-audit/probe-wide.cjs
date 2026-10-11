// Usage: node probe-wide.cjs <path> [width]  -- lists the deepest elements wider than the viewport (marketing, logged out).
const { chromium } = require('@playwright/test');
(async () => {
  const [path, w = '320'] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: +w, height: 700 }, ignoreHTTPSErrors: true })).newPage();
  await p.goto(`http://127.0.0.1:3999${path}`, { waitUntil: 'networkidle' });
  const out = await p.evaluate((vw) => {
    const res = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.width && r.right > vw + 1) {
        const kids = Array.from(el.children).some((c) => c.getBoundingClientRect().right > vw + 1);
        if (!kids) res.push(`${el.tagName}.${String(el.className).slice(0, 80)} r=${Math.round(r.right)} w=${Math.round(r.width)} :: ${(el.textContent || '').trim().slice(0, 30)}`);
      }
    }
    return res.slice(0, 15);
  }, +w);
  console.log(out.join('\n'));
  await b.close();
})();
