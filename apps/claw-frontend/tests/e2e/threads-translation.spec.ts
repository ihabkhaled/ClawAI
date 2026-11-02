import { expect, test } from '@playwright/test';

/**
 * A published Thread that has a current translation into Arabic. Set it to run this spec against a
 * live stack: THREAD_TRANSLATION_E2E_SLUG=<slug> npx playwright test threads-translation
 */
const SLUG = process.env['THREAD_TRANSLATION_E2E_SLUG'];

test.describe('Thread translations', () => {
  test.skip(SLUG === undefined, 'THREAD_TRANSLATION_E2E_SLUG is not set');

  test('the Thread language changes with ?lang while the app stays in its own language', async ({
    page,
  }) => {
    await page.goto(`/en/threads/${SLUG}`);
    const article = page.locator('article').first();
    const written = await article.locator('h1').innerText();

    const select = page.getByTestId('thread-language-switch').getByRole('combobox');
    await expect(select).toBeVisible();
    // The select is server-rendered, so a change made before hydration is lost: retry until it lands.
    await expect(async () => {
      await select.selectOption('ar');
      await expect(page).toHaveURL(
        (url) => url.pathname === `/en/threads/${SLUG}` && url.search === '?lang=ar',
        { timeout: 2000 },
      );
    }).toPass({ timeout: 20_000 });
    await expect(article).toHaveAttribute('lang', 'ar');
    await expect(article).toHaveAttribute('dir', 'rtl');
    expect(await article.locator('h1').innerText()).not.toBe(written);
    // The app itself did not change language.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page.getByRole('button', { name: 'Show the original' })).toBeVisible();

    await page.getByRole('button', { name: 'Show the original' }).click();
    await expect(page).toHaveURL(
      (url) => url.pathname === `/en/threads/${SLUG}` && url.search === '',
    );
    await expect(article).not.toHaveAttribute('dir', 'rtl');
  });

  test('a translated copy is its own canonical page and lists every language', async ({ page }) => {
    await page.goto(`/de/threads/${SLUG}?lang=ar`);

    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical?.endsWith(`/ar/threads/${SLUG}?lang=ar`)).toBe(true);
    const alternates = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('hreflang')));
    expect(alternates).toContain('x-default');
    expect(alternates).toContain('ar');
    expect(alternates.length).toBeGreaterThan(2);
  });

  test('a language with no copy falls back to the written text without an error', async ({
    page,
  }) => {
    const response = await page.goto(`/en/threads/${SLUG}?lang=zz`);

    expect(response?.status()).toBe(200);
    await expect(page.locator('article').first()).not.toHaveAttribute('dir', 'rtl');
  });

  test('the home page leads with the Public Threads card under the logo', async ({ page }) => {
    await page.goto('/en');

    const promo = page.getByTestId('home-threads-promo');
    await expect(promo).toBeVisible();
    await promo.click();

    await expect(page).toHaveURL(/\/en\/threads\/discover$/u);
  });

  test('the translated sitemap lists the copy under its own language', async ({ request }) => {
    const index = await request.get('/sitemap.xml');
    expect(await index.text()).toContain('/sitemaps/ar/translated-threads-1.xml');

    const child = await request.get('/sitemaps/ar/translated-threads-1.xml');
    expect(child.status()).toBe(200);
    expect(await child.text()).toContain(`/ar/threads/${SLUG}?lang=ar`);
  });

  test('the language control and the translated text fit every width, in both directions', async ({
    page,
  }) => {
    const widths = [360, 390, 768, 1024, 1440];
    for (const appLocale of ['en', 'ar']) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${appLocale}/threads/${SLUG}?lang=ar`);
        await expect(page.getByTestId('thread-language-switch')).toBeVisible();
        const sizes = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(sizes.document, `${appLocale} ${String(width)}`).toBeLessThanOrEqual(sizes.viewport);
      }
    }
  });
});
