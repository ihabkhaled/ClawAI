import fs from 'node:fs/promises';
import path from 'node:path';

import { expect, test } from '@playwright/test';

const BASE = process.env['PROVIDER_E2E_BASE_URL'] ?? 'http://localhost:3001';
const EMAIL = process.env['ADMIN_EMAIL'] ?? 'admin@claw.local';
const PASSWORD = process.env['ADMIN_PASSWORD'] ?? 'ClawAdmin123!';
const SCREENSHOTS = path.resolve(
  process.cwd(),
  '../../docs/qa-evidence/screenshots/runtime-managed-connector-providers',
);

test.use({ baseURL: BASE });

test('admin manages a runtime provider and the page fits common viewports', async ({ page }) => {
  test.setTimeout(90_000);
  const providerKey = `E2E_NIM_${Date.now()}`;
  const providerName = `E2E NVIDIA ${providerKey}`;

  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
  await page.locator('input#password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 30_000 });
  await page.goto('/connectors/providers');

  await page.getByLabel('Provider key').fill(providerKey);
  await page.getByLabel('Display name').fill(providerName);
  await page.getByLabel('Base URL').fill('https://integrate.api.nvidia.com');
  await page.getByLabel('Models path').fill('/v1/models');
  await page.getByRole('button', { name: 'Save provider' }).click();

  const providerCard = () =>
    page.getByRole('heading', { name: new RegExp(providerKey) }).locator('xpath=../..');
  await expect(providerCard()).toContainText(providerName);
  await fs.mkdir(SCREENSHOTS, { recursive: true });

  const viewports = [
    { name: 'mobile-360x740', width: 360, height: 740 },
    { name: 'mobile-390x844', width: 390, height: 844 },
    { name: 'tablet-768x1024', width: 768, height: 1024 },
    { name: 'landscape-844x390', width: 844, height: 390 },
    { name: 'desktop-1366x768', width: 1366, height: 768 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await expect(providerCard()).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    ).toBe(true);
    await page.screenshot({ path: path.join(SCREENSHOTS, `${viewport.name}.png`), fullPage: true });
  }

  await page.evaluate(() => {
    document.documentElement.dir = 'rtl';
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(SCREENSHOTS, 'rtl-mobile-390x844.png'), fullPage: true });
  await page.evaluate(() => {
    document.documentElement.dir = 'ltr';
  });

  await providerCard().getByRole('button', { name: 'Edit' }).click();
  await page.getByLabel('Display name').fill(`${providerName} Edited`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(providerCard()).toContainText(`${providerName} Edited`);

  await providerCard().getByRole('button', { name: 'Deactivate' }).click();
  await expect(providerCard().getByRole('button', { name: 'Activate' })).toBeVisible();
  await providerCard().getByRole('button', { name: 'Activate' }).click();
  await expect(providerCard().getByRole('button', { name: 'Deactivate' })).toBeVisible();

  await providerCard().getByRole('button', { name: 'Delete' }).click();
  await expect(providerCard()).toHaveCount(0);
});
