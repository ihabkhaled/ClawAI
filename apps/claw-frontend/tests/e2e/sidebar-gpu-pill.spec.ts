import { expect, test, type Page } from '@playwright/test';

// Sidebar GPU/CPU pill (data-testid="sidebar-gpu-pill") is gated on the
// ADMIN_SYSTEM_VIEW permission inside useGpuBadge(). This regression spec
// proves the pill is visible for ADMIN and absent for a normal USER.
//
// We hit https://claw.local (nginx reverse proxy) so the API base URL
// (relative `/api/v1`) resolves to the real backend instead of the
// frontend dev server. ignoreHTTPSErrors=true accepts the mkcert local
// root CA without needing system-trust integration in the test runner.

test.use({ baseURL: 'https://claw.local', ignoreHTTPSErrors: true });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@claw.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'ClawAdmin123!';
const USER_EMAIL = process.env.E2E_USER_EMAIL ?? 'ihab.khaled94@gmail.com';
const USER_PASSWORD = process.env.E2E_USER_PASSWORD ?? 'Ehab1234';

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  // Disambiguate from the "Show password" toggle button by selecting the
  // password input by id.
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: /sign in|login/i }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 });
}

async function logoutViaUserMenu(page: Page): Promise<void> {
  // The user menu trigger is the button containing the user's avatar fallback +
  // username in the sidebar/topbar. Clicking the avatar button opens the
  // dropdown, then we click the Logout item which calls useLogout() and
  // router.push(ROUTES.LOGIN).
  const avatarButton = page.locator('button:has(span[role="status"][aria-label])').first();
  await avatarButton.click();
  await page.getByRole('menuitem', { name: /logout|sign out/i }).click();
  await page.waitForURL((url) => url.pathname.endsWith('/login'), { timeout: 15_000 });
}

test.describe('Sidebar GPU pill — admin-only visibility', () => {
  test('admin sees the GPU/CPU pill; normal user does not', async ({ page }) => {
    // 1. Login as admin — pill MUST be visible.
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);
    const adminPill = page.getByTestId('sidebar-gpu-pill');
    await expect(adminPill).toBeVisible({ timeout: 15_000 });

    // 2. Logout, then login as a normal user — pill MUST be absent.
    await logoutViaUserMenu(page);
    await login(page, USER_EMAIL, USER_PASSWORD);

    // Give the sidebar time to fully render before asserting absence.
    await page.waitForLoadState('networkidle');
    const userPill = page.getByTestId('sidebar-gpu-pill');
    await expect(userPill).toHaveCount(0);
  });
});
