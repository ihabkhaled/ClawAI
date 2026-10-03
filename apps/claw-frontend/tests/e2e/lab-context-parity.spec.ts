import os from 'node:os';
import path from 'node:path';

import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * Chat-surface parity (rules/59): the lab pages and Compare carry the same "Context" button
 * and "Prompt library" as the chat composer. Both must be on screen and unclipped at phone,
 * tablet, landscape and desktop widths and in Arabic RTL, and picking a pack must tick it.
 *
 * Drives the real UI against the live dev stack (https://claw.local).
 */

const BASE = process.env['E2E_BASE_URL'] ?? 'https://claw.local';
const EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@claw.local';
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? 'ClawAdmin123!';
const SHOT_DIR = process.env['E2E_SHOT_DIR'] ?? '';
const PACK_NAME = 'E2E lab parity pack';

// One sign-in for the whole file: the login endpoint is rate limited, and a session saved to a
// temp file is what every case reuses.
const STATE_FILE = path.join(os.tmpdir(), 'claw-lab-context-parity-state.json');

type Case = { name: string; width: number; height: number; locale: 'en' | 'ar' };

const CASES: Case[] = [
  { name: 'mobile-360', width: 360, height: 740, locale: 'en' },
  { name: 'mobile-390', width: 390, height: 844, locale: 'en' },
  { name: 'tablet-768', width: 768, height: 1024, locale: 'en' },
  { name: 'landscape-844x390', width: 844, height: 390, locale: 'en' },
  { name: 'desktop-1366', width: 1366, height: 768, locale: 'en' },
  { name: 'rtl-ar-390', width: 390, height: 844, locale: 'ar' },
];

const PAGES = [
  { slug: 'best-of-n', path: '/chat/best-of-n' },
  { slug: 'compare', path: '/chat/compare' },
] as const;

const NAMES = {
  en: { context: 'Context', library: 'Prompt library' },
  ar: { context: 'السياق', library: 'مكتبة الأوامر' },
} as const;

const LANGUAGE_LABEL = { en: 'English', ar: 'العربية' } as const;

test.use({ ignoreHTTPSErrors: true, baseURL: BASE });

async function accessToken(page: Page): Promise<string> {
  const raw = await page.evaluate(() => window.localStorage.getItem('claw-auth-storage'));
  const state = (JSON.parse(raw ?? '{}') as { state?: { accessToken?: string } }).state;
  return state?.accessToken ?? '';
}

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: /email|البريد/i }).fill(EMAIL);
  await page.locator('input#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(dashboard|chat)/, { timeout: 45_000 });
}

/** The language is saved on the account, so a case sets it through the menu and puts it back. */
async function useLanguage(page: Page, locale: 'en' | 'ar'): Promise<void> {
  await page
    .getByRole('button', { name: /^(English|العربية),/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: LANGUAGE_LABEL[locale] }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
}

async function expectOnScreen(page: Page, target: Locator): Promise<void> {
  const box = await target.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  if (box === null || viewport === null) {
    return;
  }
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.width).toBeGreaterThan(0);
}

let packId = '';

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, storageState: undefined });
  await login(page);
  await page.context().storageState({ path: STATE_FILE });
  const headers = { Authorization: `Bearer ${await accessToken(page)}` };
  const created = await page.request.post(`${BASE}/api/v1/context-packs`, {
    headers,
    data: { name: PACK_NAME },
  });
  expect(created.ok()).toBe(true);
  const body = (await created.json()) as { id?: string; data?: { id?: string } };
  packId = body.id ?? body.data?.id ?? '';
  await page.close();
});

test.afterAll(async ({ browser }) => {
  const page = await browser.newPage({ ignoreHTTPSErrors: true, storageState: STATE_FILE });
  await page.goto(`${BASE}/login`);
  const headers = { Authorization: `Bearer ${await accessToken(page)}` };
  if (packId !== '') {
    await page.request.delete(`${BASE}/api/v1/context-packs/${packId}`, { headers });
  }
  await page.close();
});

for (const c of CASES) {
  for (const lab of PAGES) {
    test.describe(`${lab.slug} @ ${c.name}`, () => {
      test.use({ viewport: { width: c.width, height: c.height }, storageState: STATE_FILE });

      test.afterEach(async ({ page }) => {
        if (c.locale !== 'en') {
          await useLanguage(page, 'en');
        }
      });

      test('Context and Prompt library are visible, and a picked pack ticks', async ({ page }) => {
        test.setTimeout(90_000);
        await page.goto(`${BASE}${lab.path}`);
        if (c.locale !== 'en') {
          await useLanguage(page, c.locale);
        }

        const context = page.getByRole('button', { name: NAMES[c.locale].context, exact: true });
        const library = page.getByRole('button', { name: NAMES[c.locale].library });
        await expect(context.first()).toBeVisible({ timeout: 30_000 });
        await expect(library.first()).toBeVisible();
        await expectOnScreen(page, context.first());
        await expectOnScreen(page, library.first());
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
        ).toBe(true);

        await context.first().click();
        const pack = page.getByRole('checkbox').first();
        await expect(pack).toBeVisible();
        await pack.click();
        await expect(pack).toHaveAttribute('aria-checked', 'true');
        await expectOnScreen(page, page.locator('[data-radix-popper-content-wrapper]').first());
        if (SHOT_DIR !== '') {
          await page.screenshot({ path: `${SHOT_DIR}/${lab.slug}-${c.name}.png` });
        }
        await pack.click();
      });
    });
  }
}
