import { expect, test, type Page } from '@playwright/test';

// Admin credentials from .env. Required for these tests to run.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@claw.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ClawAdmin123!';

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  // Successful login redirects away from /login.
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 });
}

test.describe('Admin modules', () => {
  test('ai-action-policies: page loads with translated content + Add button', async ({ page }) => {
    await login(page);
    await page.goto('/admin/ai-action-policies');

    // PageHeader title text (in EN locale).
    await expect(page.getByRole('heading', { name: /AI Action Policies/ })).toBeVisible({
      timeout: 15_000,
    });
    // Add button is rendered with the translated label.
    const addBtn = page.getByRole('button', { name: /Add policy/ });
    await expect(addBtn).toBeVisible();
    // At least one seeded system-default badge is visible.
    await expect(page.getByText(/System default/).first()).toBeVisible();
    // No raw i18n key string ever rendered.
    await expect(page.getByText('admin.policies.title')).toHaveCount(0);
  });

  test('ai-action-policies: clicking Add opens the dialog', async ({ page }) => {
    await login(page);
    await page.goto('/admin/ai-action-policies');
    await page.getByRole('button', { name: /Add policy/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Create policy/)).toBeVisible();
    // Cancel button closes it without submitting.
    await page.getByRole('button', { name: /Cancel/ }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('suggestion-rules: page loads with translated content + Add button', async ({ page }) => {
    await login(page);
    await page.goto('/admin/suggestion-rules');
    await expect(page.getByRole('heading', { name: /Suggestion Trigger Rules/ })).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByRole('button', { name: /Add rule/ })).toBeVisible();
    await expect(page.getByText('admin.rules.title')).toHaveCount(0);
  });

  test('webhook-deliveries: page loads with filters + status select', async ({ page }) => {
    await login(page);
    await page.goto('/admin/webhook-deliveries');
    await expect(page.getByRole('heading', { name: /Webhook Deliveries/ })).toBeVisible({
      timeout: 15_000,
    });
    // Filter inputs present.
    await expect(page.getByPlaceholder(/Filter by provider/)).toBeVisible();
    // Date column should never render the literal "Invalid Date" string.
    await expect(page.getByText('Invalid Date')).toHaveCount(0);
  });
});
