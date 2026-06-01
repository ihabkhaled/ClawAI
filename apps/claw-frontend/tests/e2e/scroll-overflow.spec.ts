import { expect, test, type Page } from '@playwright/test';

// Admin credentials from .env. Required for these tests to run.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@claw.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ClawAdmin123!';

// The nginx reverse proxy serves the same Next.js frontend AND routes
// /api/v1/* into the backend services. Local dev uses a self-signed
// mkcert cert at https://claw.local — Playwright must skip TLS verification.
const APP_BASE_URL = process.env.E2E_BASE_URL ?? 'https://claw.local';

test.use({ baseURL: APP_BASE_URL, ignoreHTTPSErrors: true });

// Routes audited by the scroll regression sweep. The list mirrors the routes
// flagged as broken by the scroll-overflow audit plus the high-traffic shells
// that must always remain bottom-anchored.
const ROUTES_UNDER_AUDIT = [
  '/files',
  '/dashboard',
  '/chat',
  '/models',
  '/context',
  '/admin',
  '/agent/activity',
  '/workspace',
  '/research/runs',
] as const;

// Allow a small rounding budget — sub-pixel offsets and conditional scroll-snap
// behaviour can leave a residual 1-3 px gap even when the page is fully
// scrolled to its natural bottom.
const BOTTOM_TOLERANCE_PX = 4;

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(ADMIN_EMAIL);
  await page.getByRole('textbox', { name: /password/i }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 });
}

async function measureBottomGap(page: Page): Promise<number> {
  // Returns the residual scrollable gap (in px) of the PRIMARY scroll
  // viewport AFTER the page has been forced all the way down. The portal
  // layout puts its scroll on `<main id="main-content">`, not on the
  // document — see apps/claw-frontend/src/app/(portal)/layout.tsx. We
  // honour both: if `#main-content` exists, it is the source of truth;
  // otherwise we fall back to the document-level formula given in the
  // task brief.
  return page.evaluate(() => {
    const mainContent = document.querySelector<HTMLElement>('#main-content');
    if (mainContent) {
      return Math.max(
        0,
        mainContent.scrollHeight - (mainContent.scrollTop + mainContent.clientHeight),
      );
    }
    const doc = document.documentElement;
    return Math.max(0, doc.scrollHeight - (window.scrollY + window.innerHeight));
  });
}

async function forceScrollToBottom(page: Page): Promise<void> {
  // Two-pass scroll: pin the document AND `#main-content` (the portal
  // layout's actual viewport) AND every other scrollable descendant. The
  // second pass after a settle delay catches lazy/IntersectionObserver
  // content that only materialised after the first scroll.
  const pin = async (): Promise<void> => {
    await page.evaluate(() => {
      window.scrollTo({ left: 0, top: Number.MAX_SAFE_INTEGER, behavior: 'auto' });
      const main = document.querySelector<HTMLElement>('#main-content');
      if (main) {
        main.scrollTop = main.scrollHeight;
      }
      for (const el of document.querySelectorAll<HTMLElement>('*')) {
        const style = window.getComputedStyle(el);
        const overflowY = style.overflowY;
        if (overflowY === 'auto' || overflowY === 'scroll') {
          el.scrollTop = el.scrollHeight;
        }
      }
    });
  };
  await pin();
  await page.waitForTimeout(500);
  await pin();
  await page.waitForTimeout(150);
}

function screenshotName(route: string): string {
  const safe = route.replace(/^\//, '').replaceAll('/', '-') || 'root';
  // The task asks for qa/scroll-broken-<route>.png relative to the repo root.
  // The playwright cwd is apps/claw-frontend, so step up two levels.
  return `../../qa/scroll-broken-${safe}.png`;
}

test.describe('Scroll overflow — bottom-anchor regression sweep', () => {
  for (const route of ROUTES_UNDER_AUDIT) {
    test(`${route} scrolls cleanly to bottom of main content`, async ({ page }) => {
      await login(page);

      await page.goto(route, { waitUntil: 'domcontentloaded' });
      // Wait for any heading or main landmark to be present — this is the
      // cheap proxy for "the page rendered its primary content."
      await page
        .locator('main, [role="main"], h1, h2')
        .first()
        .waitFor({ state: 'visible', timeout: 20_000 })
        .catch(() => {
          // Some routes (e.g. /chat compose-only states) may not surface a
          // heading; in that case fall back to a generic body-content wait.
        });
      // Soft idle: let TanStack Query/SSE settle.
      await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {
        /* networkidle can hang on SSE-heavy pages; tolerate */
      });

      await forceScrollToBottom(page);
      const gap = await measureBottomGap(page);

      if (gap > BOTTOM_TOLERANCE_PX) {
        await page.screenshot({
          path: screenshotName(route),
          fullPage: true,
        });
      }

      expect(
        gap,
        `Route ${route}: page can still scroll ${gap}px past the natural bottom of its main content`,
      ).toBeLessThanOrEqual(BOTTOM_TOLERANCE_PX);
    });
  }
});
