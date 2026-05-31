import { expect, type Page } from '@playwright/test';

// Mandatory device-class matrix from the UI/UX refactor plan (section 13.3).
// Used by responsive specs to assert layout integrity at every breakpoint.
export const RESPONSIVE_VIEWPORTS = [
  { name: 'mobile-320', width: 320, height: 667 },
  { name: 'mobile-375', width: 375, height: 812 },
  { name: 'mobile-390', width: 390, height: 844 },
  { name: 'mobile-430', width: 430, height: 932 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'desktop-1366', width: 1366, height: 768 },
  { name: 'desktop-1440', width: 1440, height: 900 },
  { name: 'wide-1920', width: 1920, height: 1080 },
] as const;

// Fails when the document scrolls horizontally (the #1 mobile-usability bug the
// refactor targets). Allows a 1px rounding tolerance.
export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth > doc.clientWidth + 1;
  });

  expect(overflow).toBe(false);
}
