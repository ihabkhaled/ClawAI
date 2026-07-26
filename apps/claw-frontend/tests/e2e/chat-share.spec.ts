import { expect, test, type Page } from '@playwright/test';

/**
 * End-to-end cover for publishing a chat publicly.
 *
 * This exists because the feature shipped broken in a way no unit test could
 * see: the dialog rendered correctly, the backend worked when called correctly,
 * and the two disagreed about the request body. Publish returned 400 every
 * time, so no share row was ever created, so refresh / regenerate / indexing
 * all returned 404 afterwards. The only way to catch that class of bug is to
 * drive the real UI against the real API.
 *
 * Runs against the deployed dev stack over HTTPS, so it needs the local mkcert
 * root — `ignoreHTTPSErrors` covers the CA not being in Playwright's bundle.
 */

const BASE = 'https://claw.local';
const EMAIL = process.env['E2E_ADMIN_EMAIL'] ?? 'admin@claw.local';
const PASSWORD = process.env['E2E_ADMIN_PASSWORD'] ?? 'ClawAdmin123!';

test.use({ ignoreHTTPSErrors: true, baseURL: BASE });

async function login(page: Page): Promise<void> {
  await page.goto(`${BASE}/login`);
  // By role, not by label: the password field shares its accessible name with
  // the show/hide toggle sitting inside it.
  await page.getByRole('textbox', { name: /email/i }).fill(EMAIL);
  await page.locator('input#password').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|chat)/, { timeout: 45_000 });
}

/**
 * Opens a thread that actually has messages, and returns its id.
 *
 * The newest thread in the sidebar is frequently an empty one the user opened
 * and never sent into. Publishing that is a legitimate 400 (`EMPTY_THREAD`), so
 * picking blindly tests the wrong thing.
 */
/**
 * The access token the app is using, read from where the auth store persists it.
 *
 * `page.request` is a separate context from the page and carries no Authorization
 * header of its own, so any API call it makes is anonymous unless the token is
 * attached explicitly.
 */
async function readAccessToken(page: Page): Promise<string> {
  const raw = await page.evaluate(() => window.localStorage.getItem('claw-auth-storage'));
  if (raw === null) {
    throw new Error('not authenticated — auth storage is empty');
  }
  const parsed = JSON.parse(raw) as { state?: { accessToken?: string } };
  const token = parsed.state?.accessToken;
  if (token === undefined || token === '') {
    throw new Error('auth storage carries no access token');
  }
  return token;
}

async function openNonEmptyThread(page: Page, token: string): Promise<string> {
  await page.goto(`${BASE}/chat`);
  const links = page.locator('a[href^="/chat/"]');
  await links.first().waitFor({ state: 'visible', timeout: 30_000 });

  const hrefs = await links.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('href') ?? ''),
  );

  for (const href of hrefs) {
    const threadId = href.replace('/chat/', '');
    if (threadId === '') {
      continue;
    }
    const messages = await page.request.get(
      `${BASE}/api/v1/chat-messages/thread/${threadId}?limit=2`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!messages.ok()) {
      continue;
    }
    const payload = (await messages.json()) as { data?: unknown[] };
    if ((payload.data ?? []).length > 0) {
      await page.goto(`${BASE}/chat/${threadId}`);
      await page.waitForURL(/\/chat\/[^/]+$/, { timeout: 30_000 });
      return threadId;
    }
  }
  throw new Error('no thread with messages found — seed one before running this spec');
}

test.describe('public chat sharing', () => {
  test('publishes a thread and serves it to an anonymous visitor', async ({ page, browser }) => {
    const failed: string[] = [];
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/share') && response.status() >= 400) {
        failed.push(`${response.status()} ${response.request().method()} ${url}`);
      }
    });

    await login(page);
    const token = await readAccessToken(page);
    const threadId = await openNonEmptyThread(page, token);
    expect(threadId).not.toBe('');

    // Start from a known-unshared state so the assertions below mean something.
    // The reload matters: opening the thread already populated the TanStack Query
    // cache with the share, and this DELETE goes around that cache entirely.
    await page.request.delete(`${BASE}/api/v1/chat-threads/${threadId}/share`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await page.reload();
    await page.locator('a[href^="/chat/"]').first().waitFor({ state: 'visible' });

    await page.getByRole('button', { name: /share/i }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // An unshared thread must NOT present the published UI. A blank public-link
    // field here is the empty-body-parsed-as-'' bug returning.
    await expect(dialog.getByRole('button', { name: /stop sharing/i })).toHaveCount(0);

    await dialog.getByRole('checkbox').last().check();

    const publishResponse = page.waitForResponse(
      (r) => r.url().endsWith(`/${threadId}/share`) && r.request().method() === 'POST',
    );
    await dialog
      .getByRole('button', { name: /create link|publish|share/i })
      .last()
      .click();
    const published = await publishResponse;

    const sent = published.request().postData();
    const body = await published.text();
    expect(published.status(), `publish rejected. sent=${sent} got=${body}`).toBe(201);

    const share = (await published.json()) as { publicShareId: string; publicUrl: string };
    expect(share.publicShareId).toBeTruthy();
    expect(share.publicUrl).toContain('/share/chat/');

    // The link the owner is shown must be non-empty and must be the real one.
    // Read the field's VALUE — an empty public-link box was the original symptom
    // and it renders as a perfectly visible element either way.
    const linkField = dialog.locator('input[readonly], input[type="text"]').first();
    await expect(linkField).toHaveValue(share.publicUrl);

    // The whole point: an anonymous visitor, no cookies, no token.
    const anon = await browser.newContext({ ignoreHTTPSErrors: true });
    const anonPage = await anon.newPage();
    const visit = await anonPage.goto(`${BASE}/share/chat/${share.publicShareId}`);
    expect(visit?.status(), 'public page must not require login').toBe(200);
    await expect(anonPage).not.toHaveURL(/\/login/);
    await anon.close();

    // Every remaining control in the dialog. These all 404'd in the shipped
    // build, because publish had failed and there was no share for them to act
    // on — so exercising them is what proves the chain is actually whole.
    const updated = page.waitForResponse(
      (r) => r.url().includes(`/${threadId}/share/refresh`) && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: /update shared version/i }).click();
    expect((await updated).status(), 'update shared version').toBe(200);

    const regenerated = page.waitForResponse(
      (r) =>
        r.url().includes(`/${threadId}/share/regenerate-url`) && r.request().method() === 'POST',
    );
    await dialog.getByRole('button', { name: /generate a new link/i }).click();
    // Regenerating kills the old URL, so it asks for confirmation first.
    const confirm = page.getByRole('button', { name: /^(generate|confirm|continue)/i }).last();
    if (await confirm.isVisible().catch(() => false)) {
      await confirm.click();
    }
    const newUrl = await regenerated;
    expect(newUrl.status(), 'regenerate url').toBe(200);
    const regeneratedShare = (await newUrl.json()) as { publicShareId: string };
    expect(regeneratedShare.publicShareId).not.toBe(share.publicShareId);

    // The old identifier must now be dead, not merely unlisted.
    const stale = await page.request.get(
      `${BASE}/api/v1/public/chat-shares/${share.publicShareId}`,
    );
    expect(stale.status(), 'the previous link must stop working').toBe(404);

    expect(failed, `share requests that failed: ${failed.join(', ')}`).toEqual([]);
  });

  test('an unpublished share id is not readable', async ({ page }) => {
    const response = await page.goto(`${BASE}/share/chat/definitely-not-a-real-share-id`);
    expect(response?.status()).toBe(404);
  });
});
