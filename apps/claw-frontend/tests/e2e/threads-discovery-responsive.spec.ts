import { expect, test } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-360-portrait', width: 360, height: 800, locale: 'en' },
  { name: 'mobile-390-portrait', width: 390, height: 844, locale: 'en' },
  { name: 'mobile-430-portrait', width: 430, height: 932, locale: 'en' },
  { name: 'mobile-844-landscape', width: 844, height: 390, locale: 'en' },
  { name: 'tablet-768-portrait', width: 768, height: 1024, locale: 'en' },
  { name: 'tablet-820-portrait', width: 820, height: 1180, locale: 'en' },
  { name: 'tablet-1024-portrait', width: 1024, height: 1366, locale: 'en' },
  { name: 'tablet-1180-landscape', width: 1180, height: 820, locale: 'en' },
  { name: 'desktop-1280', width: 1280, height: 900, locale: 'en' },
  { name: 'desktop-1440', width: 1440, height: 900, locale: 'en' },
  { name: 'desktop-1920', width: 1920, height: 1080, locale: 'en' },
  { name: 'mobile-rtl', width: 390, height: 844, locale: 'ar' },
  { name: 'tablet-rtl', width: 820, height: 1180, locale: 'ar' },
  { name: 'desktop-rtl', width: 1440, height: 900, locale: 'ar' },
] as const;

test('Threads discovery empty state stays usable across device sizes and Arabic RTL', async ({
  page,
}, testInfo) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(`/${viewport.locale}/threads/discover`);

    await expect(
      page.getByRole('heading', {
        level: 1,
        name: viewport.locale === 'ar' ? 'منشورات Threads العامة' : 'Public Threads',
      }),
    ).toBeVisible();
    await expect(
      page.getByText(
        viewport.locale === 'ar'
          ? 'لا توجد منشورات عامة بهذه اللغة حاليًا.'
          : 'No public Threads are available in this language yet.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', viewport.locale);

    const dimensions = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(dimensions.documentWidth, viewport.name).toBeLessThanOrEqual(dimensions.viewportWidth);

    if (viewport.locale === 'ar') {
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    }

    await page.screenshot({
      path: testInfo.outputPath(`threads-discovery-${viewport.name}.png`),
      fullPage: true,
    });
  }
});
