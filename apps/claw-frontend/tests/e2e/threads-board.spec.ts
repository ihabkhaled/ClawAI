import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test, type Browser, type Page } from '@playwright/test';

import { expectNoHorizontalOverflow } from './helpers/responsive';

/**
 * Threads Board end-to-end.
 *
 * Run (stack up, Board deployed), from apps/claw-frontend:
 *   npx playwright test tests/e2e/threads-board.spec.ts
 * Override the target with PLAYWRIGHT_BASE_URL-style config or edit baseURL;
 * credentials via BOARD_EMAIL / BOARD_PASSWORD, target via PLAYWRIGHT_BASE_URL. The axe scan uses `axe-core`
 * when it is installed and falls back to structural ARIA assertions otherwise.
 * Every test skips (with a message) when the /board route is not deployed.
 */

const BOARD_EMAIL = process.env['BOARD_EMAIL'];
const BOARD_PASSWORD = process.env['BOARD_PASSWORD'];
const NO_CREDENTIALS = 'Set BOARD_EMAIL and BOARD_PASSWORD to run the Threads Board e2e spec';
const LOCAL_HOSTS = new Set(['claw.local', 'localhost', '127.0.0.1']);

function isLocalTarget(): boolean {
  try {
    return LOCAL_HOSTS.has(
      new URL(process.env['PLAYWRIGHT_BASE_URL'] ?? 'http://localhost:3000').hostname,
    );
  } catch {
    return false;
  }
}

// Trust the local dev certificate for the local host only; never for a real host.
test.use({ ignoreHTTPSErrors: isLocalTarget() });
const MISSPELLED = 'vectr';
const NOT_DEPLOYED = 'Threads Board route (/board) is not deployed on this stack yet';

const STATE_FILE = join(tmpdir(), 'claw-board-e2e-state.json');
test.use({ storageState: STATE_FILE });

/** Signs in once for the whole file (login is rate limited) and stores the session. */
async function signInOnce(browser: Browser, baseURL: string | undefined): Promise<void> {
  const context = await browser.newContext({
    baseURL,
    ignoreHTTPSErrors: isLocalTarget(),
    storageState: { cookies: [], origins: [] },
  });
  const page = await context.newPage();
  await page.goto('/login', { timeout: 150_000 });
  await page.waitForLoadState('networkidle'); // let React hydrate before submitting
  await page.locator('#email').fill(BOARD_EMAIL ?? '');
  await page.locator('#password').fill(BOARD_PASSWORD ?? '');
  await page.getByRole('button', { name: /^(sign in|log in|login)$/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 150_000 });
  await context.storageState({ path: STATE_FILE });
  await context.close();
}

/** Logs in, opens the Board and skips the test when the route is absent. */
async function openBoard(page: Page, path = '/board'): Promise<void> {
  const response = await page.goto(path);
  await page.waitForLoadState('networkidle'); // let React hydrate before typing
  const notFoundText = await page
    .getByText(/page not found|404/i)
    .first()
    .isVisible()
    .catch(() => false);
  test.skip(response === null || response.status() === 404 || notFoundText, NOT_DEPLOYED);
}

function searchBox(page: Page) {
  return page.getByRole('combobox').first();
}

test.describe('Threads Board', () => {
  test.beforeAll(async ({ browser, baseURL }) => {
    test.setTimeout(180_000);
    test.skip(!BOARD_EMAIL || !BOARD_PASSWORD, NO_CREDENTIALS);
    await signInOnce(browser, baseURL);
  });

  test('misspelled word shows at most 10 suggestions plus Show all', async ({ page }) => {
    await openBoard(page);
    const box = searchBox(page);
    await box.fill(MISSPELLED);
    const listbox = page.getByRole('listbox');
    await expect(listbox).toBeVisible();
    const rows = listbox.getByRole('option');
    expect(await rows.count()).toBeLessThanOrEqual(11); // 10 rows + the Show all option
    await expect(listbox.getByRole('option', { name: /show all/i })).toBeVisible();
    const suggestionRows = await rows.filter({ hasNotText: /show all/i }).count();
    expect(suggestionRows).toBeLessThanOrEqual(10);
  });

  test('Enter loads the full paginated list; page 2 and back restore state from the URL', async ({
    page,
  }) => {
    await openBoard(page);
    await searchBox(page).fill(MISSPELLED);
    await searchBox(page).press('Enter');
    await expect(page).toHaveURL(/[?&]q=vectr/);

    const next = page
      .getByRole('button', { name: /^next( page)?$/i })
      .or(page.getByRole('link', { name: /^next( page)?$/i }));
    test.skip(
      (await next.count()) === 0 || !(await next.first().isEnabled()),
      'fewer than two result pages on this stack',
    );
    await next.first().click();
    await expect(page).toHaveURL(/[?&]page=2/);
    await page.goBack();
    await expect(page).toHaveURL(/[?&]q=vectr/);
    await expect(page).not.toHaveURL(/[?&]page=2/);
    await expect(searchBox(page)).toHaveValue(MISSPELLED);
  });

  test('Show all option commits the search', async ({ page }) => {
    await openBoard(page);
    await searchBox(page).fill(MISSPELLED);
    await page.getByRole('option', { name: /show all/i }).click();
    await expect(page).toHaveURL(/[?&]q=vectr/);
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('360px: filters open in a bottom sheet without horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await openBoard(page);
    await expectNoHorizontalOverflow(page);
    await page.getByRole('button', { name: /^filters/i }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    if (box) {
      expect(box.width).toBeLessThanOrEqual(360);
      expect(box.y + box.height).toBeGreaterThan(400); // anchored to the lower half
    }
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });

  test('Arabic renders right-to-left without overflow', async ({ page, context, baseURL }) => {
    // Pin the locale preference cookie so the result does not depend on the account language.
    await context.addCookies([
      { name: 'claw-locale', value: 'ar', url: baseURL ?? 'http://localhost:3000' },
    ]);
    await page.setViewportSize({ width: 390, height: 844 });
    await openBoard(page, '/ar/board');
    test.skip(
      !new URL(page.url()).pathname.startsWith('/ar'),
      'This stack redirects /ar/board to the account language (profile language wins over the path and cookie); run with an Arabic profile to cover RTL',
    );
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
    await expectNoHorizontalOverflow(page);
    await expect(page.getByText(/threadBoard[A-Z]/)).toHaveCount(0); // no raw i18n keys
  });

  test('keyboard-only: arrow through suggestions, Enter selects, Escape closes', async ({
    page,
  }) => {
    await openBoard(page);
    const box = searchBox(page);
    await box.focus();
    await page.keyboard.type(MISSPELLED);
    await expect(page.getByRole('listbox')).toBeVisible();
    await expect(box).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('ArrowDown');
    const activeId = await box.getAttribute('aria-activedescendant');
    expect(activeId).toBeTruthy();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
    await expect(box).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/[?&]q=vectr/);
  });

  test('open combobox has no axe violations', async ({ page }) => {
    await openBoard(page);
    await searchBox(page).fill(MISSPELLED);
    await expect(page.getByRole('listbox')).toBeVisible();

    let axeSource: string | null = null;
    try {
      axeSource = readFileSync(
        createRequire(join(process.cwd(), 'package.json')).resolve('axe-core/axe.min.js'),
        'utf8',
      );
    } catch {
      axeSource = null;
    }

    if (axeSource === null) {
      // Structural fallback: the ARIA 1.2 combobox contract.
      const box = searchBox(page);
      await expect(box).toHaveAttribute('aria-controls', /.+/);
      await expect(box).toHaveAttribute('aria-expanded', 'true');
      const options = page.getByRole('listbox').getByRole('option');
      expect(await options.count()).toBeGreaterThan(0);
      return;
    }

    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: { run: () => Promise<{ violations: { id: string; impact: string | null }[] }> };
        }
      ).axe;
      const result = await axe.run();
      return result.violations
        .filter((v) => v.impact === 'serious' || v.impact === 'critical')
        .map((v) => v.id);
    });
    expect(violations).toEqual([]);
  });

  test('reader page shows engagement actions', async ({ page }) => {
    await openBoard(page);
    const card = page.locator('main h2 a').first();
    test.skip(
      (await card.count()) === 0,
      'no Board card link (main h2 a) found on this stack to open',
    );
    await card.click();
    await expect(page).toHaveURL(/\/board\/[^/?]+/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /like/i }).first()).toBeVisible();
    await expect(
      page
        .getByRole('button', { name: /copy link/i })
        .or(page.getByRole('link', { name: /open public/i }))
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole('link', { name: /back/i })
        .or(page.getByRole('button', { name: /back/i }))
        .first(),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });
});
