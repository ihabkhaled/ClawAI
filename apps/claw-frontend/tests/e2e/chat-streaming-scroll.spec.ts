import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Streaming auto-scroll contract for the chat transcript.
 *
 *   1. While an answer streams and the reader has not scrolled, the viewport
 *      stays glued to the bottom as the content grows.
 *   2. Scrolling UP mid-stream stops following — the reader is never yanked.
 *   3. Returning to the bottom resumes following.
 *
 * Drives the real UI against the live dev stack (https://claw.local), so it
 * needs the local mkcert root; `ignoreHTTPSErrors` covers that.
 */

const BASE = process.env['E2E_BASE_URL'] ?? 'https://claw.local';
const EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@claw.local';
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? 'ClawAdmin123!';

const LONG_PROMPT =
  'Write a detailed 1500-word guide to home gardening with 12 numbered sections, each section several full paragraphs. Do not stop early.';
const FOLLOW_TOLERANCE_PX = 150;
const SAMPLE_INTERVAL_MS = 250;
const SAMPLES_WHILE_FOLLOWING = 8;
const MIN_GROWTH_SAMPLES = 3;
const MIN_SCROLL_UP_MOVED_PX = 40;
const SCROLL_PIN_TOLERANCE_PX = 4;
const SCROLL_UP_PX = 600;

const VIEWPORTS = [
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'desktop-1366', width: 1366, height: 768 },
] as const;

test.use({ ignoreHTTPSErrors: true, baseURL: BASE });

// The answer length comes from a live model, so one short answer is not a product failure.
test.describe.configure({ retries: 2 });

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
  await page.locator('input#password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|chat)/, { timeout: 45_000 });
}

type ScrollMetrics = { distanceFromBottom: number; scrollTop: number; scrollHeight: number };

async function metrics(scroller: Locator): Promise<ScrollMetrics> {
  return scroller.evaluate((el) => ({
    distanceFromBottom: el.scrollHeight - el.clientHeight - el.scrollTop,
    scrollTop: el.scrollTop,
    scrollHeight: el.scrollHeight,
  }));
}

async function startLongAnswer(page: Page): Promise<Locator> {
  await page.goto(`${BASE}/chat`);
  await page
    .getByRole('button', { name: /^new chat$/i })
    .first()
    .click();
  await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30_000 });
  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ state: 'visible', timeout: 30_000 });
  await textarea.fill(LONG_PROMPT);
  await page.locator('button[type="submit"]').first().click();
  const scroller = page.locator('[data-virtuoso-scroller="true"]').first();
  await scroller.waitFor({ state: 'visible', timeout: 60_000 });
  return scroller;
}

for (const viewport of VIEWPORTS) {
  test.describe(`streaming scroll @ ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('follows the stream, stops on scroll-up, resumes at the bottom', async ({ page }) => {
      test.setTimeout(180_000);
      await login(page);
      const scroller = await startLongAnswer(page);

      // 1. Follow: the content must actually grow, and we must stay near the bottom.
      let growthSamples = 0;
      let last = await metrics(scroller);
      for (let i = 0; i < 80 && growthSamples < SAMPLES_WHILE_FOLLOWING; i += 1) {
        await page.waitForTimeout(SAMPLE_INTERVAL_MS);
        const now = await metrics(scroller);
        if (now.scrollHeight > last.scrollHeight) {
          growthSamples += 1;
          expect(
            now.distanceFromBottom,
            `sample ${growthSamples}: left behind by ${now.distanceFromBottom}px`,
          ).toBeLessThanOrEqual(FOLLOW_TOLERANCE_PX);
        }
        last = now;
      }
      expect(
        growthSamples,
        'the answer never streamed long enough to measure',
      ).toBeGreaterThanOrEqual(MIN_GROWTH_SAMPLES);

      // 2. Scroll up mid-stream: the viewport must stay where the reader put it.
      // A real wheel gesture: a programmatic scrollBy is not the reader.
      const beforeUp = await metrics(scroller);
      await scroller.hover();
      await page.mouse.wheel(0, -SCROLL_UP_PX);
      await page.waitForTimeout(300);
      const parked = await metrics(scroller);
      // A short answer cannot scroll the full distance; it must still have moved up
      // and stay parked off the live edge.
      expect(beforeUp.scrollTop - parked.scrollTop).toBeGreaterThanOrEqual(MIN_SCROLL_UP_MOVED_PX);
      expect(parked.distanceFromBottom).toBeGreaterThan(SCROLL_PIN_TOLERANCE_PX);
      await page.waitForTimeout(1500);
      const afterWait = await metrics(scroller);
      expect(Math.abs(afterWait.scrollTop - parked.scrollTop)).toBeLessThanOrEqual(5);

      // 3. Back to the bottom: following resumes.
      await scroller.hover();
      await page.mouse.wheel(0, 100_000);
      await page.waitForTimeout(1500);
      const resumed = await metrics(scroller);
      expect(resumed.distanceFromBottom).toBeLessThanOrEqual(FOLLOW_TOLERANCE_PX);
    });
  });
}
