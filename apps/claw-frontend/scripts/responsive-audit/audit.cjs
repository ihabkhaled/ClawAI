// Responsive audit. Usage:
//   node audit.cjs [--locale=en|ar] [--vp=m320,m390] [--only=substr,substr] [--tag=before]
// Local production build at LOCAL; /api/v1/** is forwarded to the dev stack at BACKEND.
// See docs/05-frontend/responsive-audit.md.
const { chromium } = require('@playwright/test');
const fs = require('node:fs');

const LOCAL = process.env.AUDIT_LOCAL ?? 'http://127.0.0.1:3999';
const BACKEND = process.env.AUDIT_BACKEND ?? 'https://claw.local';
const OUT = 'D:/Freelance/Claw/apps/claw-frontend/scripts/responsive-audit/out';
const ADMIN = { email: 'admin@claw.local', password: 'ClawAdmin123!' };

const VIEWPORTS = [
  { name: 'm320', width: 320, height: 568 },
  { name: 'm360', width: 360, height: 740 },
  { name: 'm390', width: 390, height: 844 },
  { name: 'm430', width: 430, height: 932 },
  { name: 't768', width: 768, height: 1024 },
  { name: 'l1024', width: 1024, height: 768 },
  { name: 'l1280', width: 1280, height: 720 },
  { name: 'l1440', width: 1440, height: 900 },
  { name: 'd1920', width: 1920, height: 1080 },
];
const RTL_VPS = ['m320', 'm390', 't768', 'l1280'];

const PORTAL = [
  '/dashboard',
  '/chat',
  '@thread',
  '/chat/compare',
  '/chat/consensus',
  '/files',
  '/memory',
  '/context',
  '/connectors',
  '/billing',
  '/plan',
  '/usage',
  '/settings',
  '/threads',
  '@review',
  '/observability',
  '/admin/users',
  '/admin/plans',
  '/admin/smart-router/model-costs',
  '@connectorModels',
  '/workspace',
];
const MARKETING = [
  '',
  '/features',
  '/features/threads',
  '/how-it-works',
  '/pricing',
  '/compare',
  '/compare/chatgpt',
  '/about',
  '/faq',
  '/contact',
  '/integrations',
  '/model-providers',
  '/learn',
  '/use-cases',
  '/architecture',
  '/coding-agent',
  '/threads/discover',
  '/login',
  '/register',
];
const SAMPLES = new Set(['/dashboard', '/chat', '']);

const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? '').split('=')[1];
const LOCALE = arg('locale') ?? 'en';
const TAG = arg('tag') ?? 'run';
const ONLY = (arg('only') ?? '').split(',').filter(Boolean);
const vpFilter = arg('vp')
  ? arg('vp').split(',')
  : LOCALE === 'ar'
    ? RTL_VPS
    : VIEWPORTS.map((v) => v.name);

const NOISE_CSS = `
  nextjs-portal, [data-nextjs-toast], [data-next-badge-root] { display: none !important; }
  *, *::before, *::after { caret-color: transparent !important; animation-duration: 0s !important; transition-duration: 0s !important; }
`;

/* Runs in the page. Returns the issues found. */
function inspect({ vw, mobile }) {
  const issues = [];
  const de = document.documentElement;
  if (de.scrollWidth > de.clientWidth + 1) {
    issues.push({
      kind: 'page-overflow',
      detail: `scrollWidth ${de.scrollWidth} > clientWidth ${de.clientWidth}`,
    });
  }

  // The portal shell is exactly one viewport tall; a taller document means something escaped its clip
  // (an absolutely positioned sr-only element) and the whole shell can scroll up, leaving a blank band.
  if (de.scrollHeight > window.innerHeight + 1 && document.querySelector('[data-testid="topbar"]')) {
    issues.push({
      kind: 'page-vertical-overflow',
      detail: `scrollHeight ${de.scrollHeight} > innerHeight ${window.innerHeight}`,
    });
  }

  const describe = (el) => {
    const cls =
      typeof el.className === 'string'
        ? el.className.trim().split(/\s+/).slice(0, 6).join('.')
        : '';
    const txt = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
    return `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${cls ? '.' + cls : ''} "${txt}"`;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      if (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('inert')) return false;
    }
    return true;
  };
  const clippedByAncestor = (el) => {
    for (let n = el.parentElement; n && n !== document.body && n !== de; n = n.parentElement) {
      const ox = getComputedStyle(n).overflowX;
      if (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') {
        const pr = n.getBoundingClientRect();
        // A scroll container protects its content. An overflow-hidden box that touches the viewport
        // edge is the app shell: it does not protect anything, it silently cuts the content off.
        if (ox === 'auto' || ox === 'scroll') return pr.right <= vw + 1 && pr.left >= -1;
        if (pr.right <= vw - 3 && pr.left >= 3) return true;
      }
    }
    return false;
  };
  const offscreenOK = (el) => {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      if (n.getAttribute('data-state') === 'closed') return true;
      const cl = typeof n.className === 'string' ? n.className : '';
      if (/\bsr-only\b/.test(cl)) return true;
    }
    return false;
  };

  const SKIP = [
    'SCRIPT',
    'STYLE',
    'NOSCRIPT',
    'PATH',
    'LINE',
    'CIRCLE',
    'RECT',
    'G',
    'SVG',
    'POLYLINE',
    'USE',
    'DEFS',
  ];
  const all = Array.from(document.body.querySelectorAll('*'));
  const offenders = new Set();
  for (const el of all) {
    if (SKIP.includes(el.tagName.toUpperCase())) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    if (r.right <= vw + 1 && r.left >= -1) continue;
    if (!visible(el) || clippedByAncestor(el) || offscreenOK(el)) continue;
    offenders.add(el);
  }
  const tops = Array.from(offenders).filter((el) => !offenders.has(el.parentElement));
  for (const el of tops.slice(0, 8)) {
    const r = el.getBoundingClientRect();
    issues.push({
      kind: 'beyond-viewport',
      detail: `${describe(el)} l=${Math.round(r.left)} r=${Math.round(r.right)} vw=${vw}`,
    });
  }

  // Top bar
  const header = document.querySelector('header[data-top-obstacle]');
  if (header) {
    const hr = header.getBoundingClientRect();
    if (header.scrollWidth > header.clientWidth + 1) {
      issues.push({
        kind: 'topbar-clipped',
        detail: `header scrollWidth ${header.scrollWidth} > ${header.clientWidth}`,
      });
    }
    for (const b of header.querySelectorAll('button, a, [role="button"]')) {
      if (!visible(b)) continue;
      const r = b.getBoundingClientRect();
      if (r.right > Math.min(vw, hr.right) + 1 || r.left < Math.max(0, hr.left) - 1) {
        issues.push({
          kind: 'topbar-clipped',
          detail: `${describe(b)} l=${Math.round(r.left)} r=${Math.round(r.right)}`,
        });
      }
    }
    const h1 = header.querySelector('h1');
    if (h1 && visible(h1) && h1.getBoundingClientRect().width < 2) {
      issues.push({ kind: 'zero-width-text', detail: 'topbar title width <2' });
    }
  }

  // Text squeezed to nothing
  let zero = 0;
  for (const el of document.body.querySelectorAll('h1,h2,h3,p,span,label,button,a')) {
    if (!(el.textContent || '').trim() || (el.textContent || '').trim().length <= 3) continue;
    const r = el.getBoundingClientRect();
    if (
      r.height > 0 &&
      r.width > 0 &&
      r.width < 4 &&
      !el.closest('.sr-only') &&
      visible(el) &&
      zero++ < 5
    ) {
      issues.push({ kind: 'zero-width-text', detail: describe(el) });
    }
  }

  // Text cut down to a few characters by an ellipsis (a card title shown as "N"), or a heading ellipsised.
  let cut = 0;
  for (const el of document.body.querySelectorAll('h1,h2,h3,h4,p,span,a,button,div,label')) {
    if (el.children.length > 0 && !/^H[1-4]$/.test(el.tagName)) continue;
    const cs = getComputedStyle(el);
    if (cs.textOverflow !== 'ellipsis' && cs.webkitLineClamp === 'none') continue;
    if (el.scrollWidth <= el.clientWidth + 1 || !visible(el) || el.closest('.sr-only')) continue;
    const txt = (el.textContent || '').trim();
    const heading = /^H[1-4]$/.test(el.tagName);
    if (
      txt.length > 6 &&
      cut++ < 6 &&
      (el.clientWidth < 56 ||
        (heading && el.clientWidth < 120 && el.clientWidth / el.scrollWidth < 0.5))
    ) {
      issues.push({
        kind: 'over-truncated',
        detail: `${describe(el)} shows ${el.clientWidth}px of ${el.scrollWidth}px`,
      });
    }
  }

  // Fixed overlap (top-level fixed elements, not dialogs/popovers)
  const hasFixedParent = (el) => {
    for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
      if (getComputedStyle(n).position === 'fixed') return true;
    }
    return false;
  };
  const fixed = all.filter(
    (el) =>
      getComputedStyle(el).position === 'fixed' &&
      visible(el) &&
      !el.closest('[role="dialog"]') &&
      !el.closest('[data-radix-popper-content-wrapper]') &&
      !hasFixedParent(el),
  );
  for (let i = 0; i < fixed.length; i++) {
    for (let j = i + 1; j < fixed.length; j++) {
      const a = fixed[i].getBoundingClientRect();
      const b = fixed[j].getBoundingClientRect();
      const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (ox > 4 && oy > 4)
        issues.push({
          kind: 'fixed-overlap',
          detail: `${describe(fixed[i])} x ${describe(fixed[j])} (${Math.round(ox)}x${Math.round(oy)})`,
        });
    }
  }

  // Tap targets (mobile only; warning class)
  if (mobile) {
    const small = [];
    const sel =
      'button, [role="button"], input:not([type=hidden]), select, textarea, nav a, header a';
    for (const el of document.body.querySelectorAll(sel)) {
      if (!visible(el)) continue;
      if (el.tagName === 'INPUT' && ['checkbox', 'radio'].includes(el.type)) continue;
      const r = el.getBoundingClientRect();
      if (r.right < 0 || r.left > vw) continue;
      if (r.width < 24 || r.height < 24)
        small.push(`${describe(el)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    if (small.length)
      issues.push({
        kind: 'small-tap-target',
        detail: `${small.length}: ${small.slice(0, 3).join(' | ')}`,
      });
  }
  return issues;
}

async function newCtx(browser, vp, loggedIn, rtl) {
  const mobile = vp.width < 500;
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
    colorScheme: 'dark',
    locale: rtl ? 'ar' : 'en-US',
    isMobile: mobile,
    hasTouch: mobile,
  });
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    try {
      const response = await route.fetch({ url: `${BACKEND}${url.pathname}${url.search}` });
      await route.fulfill({ response });
    } catch {
      await route.abort();
    }
  });
  if (rtl) {
    // The portal reads its locale from localStorage, not from the URL prefix.
    await context.addInitScript(() => {
      try {
        localStorage.setItem('claw-locale', 'ar');
      } catch {
        /* storage blocked */
      }
    });
  }
  await context.addInitScript((css) => {
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    });
  }, NOISE_CSS);
  const page = await context.newPage();
  if (loggedIn) {
    await page.goto(`${LOCAL}/${LOCALE}/login`, { waitUntil: 'domcontentloaded' });
    await page.locator('input[type=email], input[name=email]').first().fill(ADMIN.email);
    await page.locator('input[type=password]').first().fill(ADMIN.password);
    await page.locator('button[type=submit]').first().click();
    await page.waitForURL(/\/[a-z]{2}\/(dashboard|chat)/, { timeout: 60000 });
  }
  return { context, page };
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await page
    .waitForFunction(
      () => !document.querySelector('[class*="animate-pulse"], [aria-busy="true"]'),
      null,
      { timeout: 8000 },
    )
    .catch(() => {});
  await page.waitForTimeout(600);
}

// Sidebar thread rows are not plain links, so read the first thread id from the list response.
async function findThread(page) {
  let id = null;
  const onResponse = async (res) => {
    if (id || !/\/api\/v1\/.*threads/.test(res.url()) || res.request().method() !== 'GET') return;
    const body = await res.json().catch(() => null);
    const list = Array.isArray(body)
      ? body
      : (body?.data?.items ?? body?.data ?? body?.items ?? []);
    const first = Array.isArray(list) ? list.find((t) => t && typeof t.id === 'string') : null;
    if (first) id = first.id;
  };
  page.on('response', onResponse);
  await page.goto(`${LOCAL}/${LOCALE}/chat`, { waitUntil: 'domcontentloaded' });
  await settle(page);
  page.off('response', onResponse);
  return id ? `/chat/${id}` : null;
}

async function discover(page) {
  const find = async (path, source) => {
    await page.goto(`${LOCAL}/${LOCALE}${path}`, { waitUntil: 'domcontentloaded' });
    await settle(page);
    return page.evaluate((src) => {
      const re = new RegExp(src);
      for (const a of document.querySelectorAll('a[href]')) {
        const m = a.getAttribute('href').match(re);
        if (m) return m[0];
      }
      return null;
    }, source);
  };
  const strip = (p) => (p ? p.replace(new RegExp(`^/${LOCALE}`), '') : p);
  return {
    thread: await findThread(page),
    review: strip(await find('/threads', '/threads/review/[\\w-]+')),
    connector: strip(await find('/connectors', '/connectors/(?!providers)[\\w-]{8,}')),
  };
}

async function menuChecks(page, vp) {
  const issues = [];
  const vw = vp.width;
  const vh = vp.height;
  const inView = (r) => r.left >= -1 && r.right <= vw + 1 && r.top >= -1 && r.bottom <= vh + 1;
  const trig = page.locator('[data-testid="topbar-overflow-trigger"]');
  if (await trig.isVisible().catch(() => false)) {
    await trig.click();
    await page.waitForTimeout(400);
    const panel = page.locator('[data-testid="topbar-overflow-panel"]');
    const pr = await panel.boundingBox();
    if (!pr) {
      issues.push({ kind: 'more-panel', detail: 'panel did not open' });
    } else {
      if (!inView({ left: pr.x, right: pr.x + pr.width, top: pr.y, bottom: pr.y + pr.height })) {
        issues.push({ kind: 'more-panel', detail: `panel out of view ${JSON.stringify(pr)}` });
      }
      const kids = await panel.locator('button, a').evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return {
            l: Math.round(r.left),
            r: Math.round(r.right),
            t: Math.round(r.top),
            b: Math.round(r.bottom),
            w: r.width,
          };
        }),
      );
      if (kids.length < 4)
        issues.push({ kind: 'more-panel', detail: `only ${kids.length} controls` });
      for (const k of kids) {
        if (k.w > 0 && (k.l < -1 || k.r > vw + 1 || k.t < -1 || k.b > vh + 1)) {
          issues.push({ kind: 'more-panel', detail: `control out of view ${JSON.stringify(k)}` });
        }
      }
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      );
      if (over) issues.push({ kind: 'more-panel', detail: 'page overflow while open' });
      if (!process.env.NO_SHOT)
        await page.screenshot({ path: `${OUT}/${TAG}-${LOCALE}-${vp.name}-more-panel.png` });
      await page.keyboard.press('Escape');
    }
  }
  await page
    .locator('header[data-top-obstacle] button')
    .last()
    .click()
    .catch(() => {});
  await page.waitForTimeout(400);
  const mr = await page
    .locator('[role="menu"]')
    .first()
    .boundingBox()
    .catch(() => null);
  if (!mr) {
    issues.push({ kind: 'user-menu', detail: 'menu did not open' });
  } else {
    if (!inView({ left: mr.x, right: mr.x + mr.width, top: mr.y, bottom: mr.y + mr.height })) {
      issues.push({
        kind: 'user-menu',
        detail: `menu out of view ${JSON.stringify(mr)} vp ${vw}x${vh}`,
      });
    }
    if (!process.env.NO_SHOT)
      await page.screenshot({ path: `${OUT}/${TAG}-${LOCALE}-${vp.name}-user-menu.png` });
  }
  await page.keyboard.press('Escape');
  return issues;
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const results = [];
  const vps = VIEWPORTS.filter((v) => vpFilter.includes(v.name));
  const rtl = LOCALE === 'ar';
  for (const vp of vps) {
    const mobile = vp.width < 500;
    for (const group of ['portal', 'marketing']) {
      const { context, page } = await newCtx(browser, vp, group === 'portal', rtl);
      const routes = group === 'portal' ? PORTAL : MARKETING;
      const ids = group === 'portal' ? await discover(page) : {};
      for (const r of routes) {
        let path = r;
        if (r === '@thread') path = ids.thread;
        if (r === '@review') path = ids.review;
        if (r === '@connectorModels') path = ids.connector ? `${ids.connector}/models` : null;
        const label = r.startsWith('@') ? `${r}(${path ?? 'none'})` : r || '/';
        if (ONLY.length && !ONLY.some((o) => label.includes(o))) continue;
        if (path === null || path === undefined) {
          results.push({
            group,
            route: label,
            vp: vp.name,
            locale: LOCALE,
            skipped: true,
            issues: [],
          });
          continue;
        }
        let issues = [];
        try {
          await page.goto(`${LOCAL}/${LOCALE}${path}`, {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
          });
          await settle(page);
          issues = await page.evaluate(inspect, { vw: vp.width, mobile });
          if (group === 'portal' && r === '/dashboard')
            issues.push(...(await menuChecks(page, vp)));
        } catch (e) {
          issues.push({ kind: 'load-error', detail: String(e.message).slice(0, 120) });
        }
        const hard = issues.filter((i) => i.kind !== 'small-tap-target');
        const rec = {
          group,
          route: label,
          vp: vp.name,
          locale: LOCALE,
          issues,
          fail: hard.length > 0,
        };
        const slug = label.replace(/[^\w]+/g, '_').slice(0, 40) || 'home';
        if (!process.env.NO_SHOT && (rec.fail || SAMPLES.has(r))) {
          await page
            .screenshot({ path: `${OUT}/${TAG}-${LOCALE}-${vp.name}-${slug}.png` })
            .catch(() => {});
        }
        results.push(rec);
        console.log(
          `${rec.fail ? 'FAIL' : 'ok  '} ${LOCALE} ${vp.name} ${label} ${hard.map((i) => i.kind).join(',')}`,
        );
      }
      await context.close();
    }
  }
  fs.writeFileSync(`${OUT}/${TAG}-${LOCALE}-results.json`, JSON.stringify(results, null, 1));
  console.log(
    `\nTOTAL ${results.length}  FAIL ${results.filter((x) => x.fail).length}  SKIPPED ${results.filter((x) => x.skipped).length}`,
  );
  await browser.close();
}

main().catch((e) => {
  console.log('ERR', e);
  process.exit(1);
});
