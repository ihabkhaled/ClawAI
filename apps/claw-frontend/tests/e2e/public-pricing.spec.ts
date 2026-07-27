import { expect, test } from '@playwright/test';

const catalog = ['Free', 'Pro', 'Team'].map((name, index) => ({
  id: `plan-${String(index)}`,
  slug: name.toLowerCase(),
  name,
  description: `${name} subscription`,
  displayOrder: index,
  isDefault: name === 'Pro',
  dailyTokenQuota: index === 0 ? 0 : 250_000,
  weeklyTokenQuota: null,
  monthlyTokenQuota: name === 'Team' ? null : 4_000_000,
  maxChatsPerDay: null,
  maxMessagesPerDay: null,
  maxWorkspaceConnections: index,
  maxContextPacks: index,
  maxMemoryItems: index,
  prices: [
    {
      id: `price-${String(index)}`,
      planId: `plan-${String(index)}`,
      billingInterval: 'MONTHLY',
      currency: 'USD',
      amountMinor: index * 2_000,
      version: 1,
      isActive: true,
    },
  ],
  features: [],
}));

test('serves live plan CTAs to an anonymous visitor with accessible controls', async ({
  page,
  context,
}) => {
  await context.clearCookies();
  await page.route('**/api/pricing', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(catalog),
    });
  });

  await page.goto('/en/pricing');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('group')).toBeVisible();
  await expect(page.getByRole('link', { name: /start free|choose this plan/i })).toHaveCount(3);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  expect(await page.evaluate(() => window.localStorage.getItem('claw-auth-storage'))).toBeNull();
});
