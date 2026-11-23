import os from 'node:os';
import path from 'node:path';

import { expect, test, type Page, type Route } from '@playwright/test';

/**
 * The Compare picker shows the plan decision (ADR-198): a cost mark per model, a model outside
 * the allowance dimmed but still tickable, and a model outside the plan locked with a
 * "Not on your plan" tag that shrinks instead of overflowing the narrow desktop column.
 *
 * The admin sees every model allowed, so the plan answer (`POST /chat-messages/model-access`)
 * is rewritten in the browser: GPT 4o models are locked, Gemini models are PREMIUM and outside
 * the allowance. Everything else (sign-in, the model list, the picker) is the live dev stack.
 */

const BASE = process.env['E2E_BASE_URL'] ?? 'https://claw.local';
const EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@claw.local';
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? 'ClawAdmin123!';
const STATE_FILE = path.join(os.tmpdir(), 'claw-compare-model-picker-state.json');

const LOCKED_SEARCH = 'GPT 4o';
const DIMMED_SEARCH = 'Gemini 2.5 Flash';
const LOCKED_LABEL = { en: 'Not on your plan', ar: 'ليس ضمن خطتك' } as const;
const LANGUAGE_LABEL = { en: 'English', ar: 'العربية' } as const;

type AccessEntry = {
  provider: string;
  model: string;
  allowed: boolean;
  costClass?: string;
  coveredByAllowance?: boolean;
};

test.use({ ignoreHTTPSErrors: true, baseURL: BASE });

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  await page.getByRole('textbox', { name: /email|البريد/i }).fill(EMAIL);
  await page.locator('input#password').fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForURL(/\/(dashboard|chat)/, { timeout: 45_000 });
}

function rewriteEntry(entry: AccessEntry): AccessEntry {
  const id = entry.model.toLowerCase();
  if (id.includes('gpt-4o')) {
    return { ...entry, allowed: false, costClass: 'PREMIUM', coveredByAllowance: false };
  }
  if (id.includes('gemini')) {
    return { ...entry, allowed: true, costClass: 'PREMIUM', coveredByAllowance: false };
  }
  return entry;
}

/** The plan answer may be the array itself or wrapped in `data`; both are rewritten. */
async function rewritePlanAnswer(route: Route): Promise<void> {
  const response = await route.fetch();
  const body = (await response.json()) as AccessEntry[] | { data: AccessEntry[] };
  const rewritten = Array.isArray(body)
    ? body.map(rewriteEntry)
    : { ...body, data: body.data.map(rewriteEntry) };
  await route.fulfill({ response, json: rewritten });
}

async function useLanguage(page: Page, locale: 'en' | 'ar'): Promise<void> {
  await page
    // The accessible name starts with the short code ("EN English, Select language").
    .getByRole('button', { name: /(English|العربية),/ })
    .first()
    .click();
  await page.getByRole('menuitem', { name: LANGUAGE_LABEL[locale] }).click();
  await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
}

async function openCompare(page: Page): Promise<void> {
  await page.route('**/chat-messages/model-access', rewritePlanAnswer);
  await page.goto(`${BASE}/chat/compare`);
  await expect(page.getByTestId('parallel-model-list')).toBeVisible({ timeout: 30_000 });
}

async function search(page: Page, text: string): Promise<void> {
  const box = page.getByTestId('parallel-model-list').locator('..').getByRole('textbox').first();
  await box.fill(text);
}

async function expectListDoesNotOverflow(page: Page): Promise<void> {
  const overflow = await page.getByTestId('parallel-model-list').evaluate((list) => {
    const scroller = list.querySelector('[data-virtuoso-scroller]') ?? list;
    return scroller.scrollWidth - scroller.clientWidth;
  });
  expect(overflow).toBeLessThanOrEqual(1);
}

test.describe('Compare model picker shows the plan decision', () => {
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: true, storageState: undefined });
    const page = await context.newPage();
    await login(page);
    await context.storageState({ path: STATE_FILE });
    await context.close();
  });

  test.use({ storageState: STATE_FILE });

  for (const width of [375, 1280]) {
    test(`locked and dimmed rows at ${String(width)} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openCompare(page);

      await search(page, LOCKED_SEARCH);
      const lockedTag = page.getByText(LOCKED_LABEL.en, { exact: true }).first();
      await expect(lockedTag).toBeVisible();
      await expect(lockedTag).toHaveAttribute('title', LOCKED_LABEL.en);
      const lockedRow = page.getByRole('button').filter({ has: lockedTag }).first();
      await expect(lockedRow).toBeDisabled();
      await expect(lockedRow.getByTestId('model-cost-mark-PREMIUM')).toBeVisible();
      await expectListDoesNotOverflow(page);

      await search(page, DIMMED_SEARCH);
      const dimmedRow = page
        .getByTestId('parallel-model-list')
        .getByRole('button')
        .filter({ has: page.getByTestId('model-cost-mark-PREMIUM') })
        .first();
      await expect(dimmedRow).toBeEnabled();
      await expect(dimmedRow).toHaveClass(/opacity-60/);
      await dimmedRow.click();
      await expect(dimmedRow).toHaveClass(/bg-accent/);
      await expectListDoesNotOverflow(page);
    });
  }

  test('Arabic mirrors the row and translates the tag', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await openCompare(page);
    await useLanguage(page, 'ar');
    try {
      await search(page, LOCKED_SEARCH);
      const lockedTag = page.getByText(LOCKED_LABEL.ar, { exact: true }).first();
      await expect(lockedTag).toBeVisible();
      await expectListDoesNotOverflow(page);
    } finally {
      // The language is saved on the account: put it back for the next spec.
      await useLanguage(page, 'en');
    }
  });
});
