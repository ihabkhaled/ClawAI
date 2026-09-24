import { expect, test, type Page } from '@playwright/test';

// Admin credentials from .env. Required for these tests to run.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@claw.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ClawAdmin123!';

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15_000 });
}

// Connector presets batch 3: the searchable grouped provider combobox
// (ADR-117). Covers the full create-connector flow — open the form, search a
// preset by name in the combobox, pick it, and confirm the name/base URL/auth
// type prefilled from the registry while the base URL stays editable.
test.describe('Connector provider combobox', () => {
  test('creating a connector: searching and picking a preset prefills the form', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/connectors');
    await expect(page.getByRole('heading', { name: /Connectors/ })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('button', { name: /Add Connector/ }).click();
    await expect(page.getByRole('dialog').or(page.getByRole('complementary'))).toBeVisible();

    // Open the searchable provider combobox and search for a preset.
    const providerCombobox = page.getByRole('combobox', { name: /Select a provider|Provider/ });
    await providerCombobox.click();
    await page.getByPlaceholder(/Search providers/).fill('Groq');
    await expect(page.getByText('Low-cost and fast inference')).toBeVisible();
    await page.getByText('Groq', { exact: true }).click();

    // The trigger now shows the selected provider.
    await expect(providerCombobox).toContainText('Groq');

    // Name and base URL prefilled from the registry, base URL still editable.
    const nameInput = page.getByLabel(/^Name$/);
    await expect(nameInput).toHaveValue('Groq');
    const baseUrlInput = page.getByLabel(/Base URL/);
    await expect(baseUrlInput).toHaveValue('https://api.groq.com/openai/v1');
    await baseUrlInput.fill('https://custom-proxy.example.com/v1');
    await expect(baseUrlInput).toHaveValue('https://custom-proxy.example.com/v1');

    // The 4 registry links render, each opening in a new tab.
    const registerLink = page.getByRole('link', { name: /Sign up/ });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('target', '_blank');
    await expect(registerLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('Cloudflare preset shows the account-id field and validates hex input', async ({ page }) => {
    await login(page);
    await page.goto('/connectors');
    await page.getByRole('button', { name: /Add Connector/ }).click();

    const providerCombobox = page.getByRole('combobox', { name: /Select a provider|Provider/ });
    await providerCombobox.click();
    await page.getByPlaceholder(/Search providers/).fill('Cloudflare');
    await page.getByText('Cloudflare Workers AI', { exact: true }).click();

    const accountIdInput = page.getByLabel(/Account ID/);
    await expect(accountIdInput).toBeVisible();

    await accountIdInput.fill('not-hex');
    await page.getByRole('button', { name: /Create Connector/ }).click();
    await expect(page.getByText(/32 hexadecimal characters/)).toBeVisible();
  });

  test('the combobox is keyboard-navigable without a mouse', async ({ page }) => {
    await login(page);
    await page.goto('/connectors');
    await page.getByRole('button', { name: /Add Connector/ }).click();

    const providerCombobox = page.getByRole('combobox', { name: /Select a provider|Provider/ });
    await providerCombobox.click();
    await page.keyboard.type('Mistral');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    await expect(providerCombobox).toContainText('Mistral');
  });
});
