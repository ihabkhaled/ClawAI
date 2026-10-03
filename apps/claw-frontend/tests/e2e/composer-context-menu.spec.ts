import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * The composer's ONE "Context" button (packs pick, view, memory) must be on
 * screen without sideways scrolling at every phone/tablet/desktop width, in both
 * orientations and in Arabic RTL, and each of its three jobs must work.
 *
 * Drives the real UI against the live dev stack (https://claw.local).
 */

const BASE = process.env['E2E_BASE_URL'] ?? 'https://claw.local';
const EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@claw.local';
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? 'ClawAdmin123!';
const SHOT_DIR = process.env['E2E_SHOT_DIR'] ?? '';

type Case = { name: string; width: number; height: number; locale: 'en' | 'ar' };

const CASES: Case[] = [
  { name: 'mobile-360', width: 360, height: 740, locale: 'en' },
  { name: 'mobile-390', width: 390, height: 844, locale: 'en' },
  { name: 'tablet-768-portrait', width: 768, height: 1024, locale: 'en' },
  { name: 'landscape-844x390', width: 844, height: 390, locale: 'en' },
  { name: 'desktop-1366', width: 1366, height: 768, locale: 'en' },
  { name: 'rtl-ar-390', width: 390, height: 844, locale: 'ar' },
  { name: 'rtl-ar-360', width: 360, height: 740, locale: 'ar' },
];

const CONTEXT_BUTTON_NAME = { en: 'Context', ar: 'السياق' } as const;
const DIALOG = '[role="dialog"][data-state="open"][aria-labelledby]';
const ROWS = '[data-radix-popper-content-wrapper] button:not([role="checkbox"])';

test.use({ ignoreHTTPSErrors: true, baseURL: BASE });

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: /email|البريد/i }).fill(EMAIL);
  await page.locator('input#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(dashboard|chat)/, { timeout: 45_000 });
}

async function ensureOnePack(page: Page): Promise<void> {
  const raw = await page.evaluate(() => window.localStorage.getItem('claw-auth-storage'));
  const token = (JSON.parse(raw ?? '{}') as { state?: { accessToken?: string } }).state
    ?.accessToken;
  const headers = { Authorization: `Bearer ${token ?? ''}` };
  const list = await page.request.get(`${BASE}/api/v1/context-packs`, { headers });
  const body = (await list.json()) as { data?: unknown[] };
  if ((body.data ?? []).length === 0) {
    const created = await page.request.post(`${BASE}/api/v1/context-packs`, {
      headers,
      data: { name: 'E2E composer pack', description: 'created by composer-context-menu.spec' },
    });
    expect(created.ok()).toBe(true);
  }
}

const LANGUAGE_LABEL = { en: 'English', ar: 'العربية' } as const;

/**
 * The language choice is saved on the account, not just in the browser, so
 * every case sets it explicitly and the last step puts it back to English.
 */
async function useLanguage(page: Page, locale: 'en' | 'ar'): Promise<void> {
  await page
    .getByRole('button', { name: /^(English|العربية),/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: LANGUAGE_LABEL[locale] }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('claw-locale')))
    .toBe(locale);
}

async function openFreshChat(page: Page): Promise<void> {
  await page.goto(`${BASE}/chat`);
  await page
    .getByRole('button', { name: /^new chat$|محادثة جديدة/i })
    .first()
    .click();
  await page.waitForURL(/\/chat\/[\w-]+/, { timeout: 30_000 });
  await page.locator('textarea').first().waitFor({ state: 'visible', timeout: 30_000 });
}

async function expectOnScreenAndUnobstructed(page: Page, button: Locator): Promise<void> {
  const box = await button.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  if (box === null || viewport === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
  const hit = await button.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return top !== null && (el === top || el.contains(top));
  });
  expect(hit).toBe(true);
}

async function shot(page: Page, name: string): Promise<void> {
  if (SHOT_DIR !== '') {
    await page.screenshot({ path: `${SHOT_DIR}/${name}.png` });
  }
}

for (const c of CASES) {
  test.describe(`composer context @ ${c.name}`, () => {
    test.use({ viewport: { width: c.width, height: c.height } });

    test.afterEach(async ({ page }) => {
      if (c.locale !== 'en') {
        await useLanguage(page, 'en');
      }
    });

    test('Context button is visible and pick / view / memory work', async ({ page }) => {
      test.setTimeout(120_000);
      await login(page);
      await ensureOnePack(page);
      await useLanguage(page, c.locale);
      await openFreshChat(page);
      await expect(page.locator('html')).toHaveAttribute('dir', c.locale === 'ar' ? 'rtl' : 'ltr');

      const button = page.getByRole('button', { name: CONTEXT_BUTTON_NAME[c.locale], exact: true });
      await expect(button).toBeVisible();
      await expectOnScreenAndUnobstructed(page, button);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
      ).toBe(true);
      await shot(page, `${c.name}-1-closed`);

      // Pick: the menu lists packs; toggling one moves the badge on the button.
      await button.click();
      const checkbox = page.getByRole('checkbox').first();
      await expect(checkbox).toBeVisible();
      const before = await checkbox.getAttribute('aria-checked');
      await checkbox.click();
      await expect(checkbox).not.toHaveAttribute('aria-checked', before ?? 'false');
      const menu = page.locator('[data-radix-popper-content-wrapper]').first();
      const menuBox = await menu.boundingBox();
      expect(menuBox).not.toBeNull();
      if (menuBox !== null) {
        expect(menuBox.x).toBeGreaterThanOrEqual(0);
        expect(menuBox.x + menuBox.width).toBeLessThanOrEqual(c.width + 1);
      }
      await shot(page, `${c.name}-2-pick`);
      await checkbox.click();
      await expect(checkbox).toHaveAttribute('aria-checked', before ?? 'false');

      // View and memory: the two rows under the packs open their dialogs.
      await page.locator(ROWS).nth(0).click();
      await expect(page.locator(DIALOG)).toBeVisible();
      await shot(page, `${c.name}-3-view`);
      await page.keyboard.press('Escape');
      await expect(page.locator(DIALOG)).toHaveCount(0);

      await button.click();
      await page.locator(ROWS).nth(1).click();
      await expect(page.locator(DIALOG)).toBeVisible();
      await shot(page, `${c.name}-4-memory`);
      await page.keyboard.press('Escape');
      await expect(page.locator(DIALOG)).toHaveCount(0);
      await shot(page, `${c.name}-5-done`);
    });
  });
}
