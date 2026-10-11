// Browser lane for Web Push: sign in, open settings, turn the push switch on and off.
// Needs the production build on :3999 (the service worker registers only in production).
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require('@playwright/test');

const LOCAL = 'http://127.0.0.1:3999';
const BACKEND = 'https://claw.local';

async function main() {
  // A persistent profile: Chrome refuses the Push API in the incognito-style default context.
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'claw-push-'));
  const context = await chromium.launchPersistentContext(profile, {
    channel: 'chromium',
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  await context.grantPermissions(['notifications'], { origin: LOCAL });
  await context.route('**/api/v1/**', async (route) => {
    const url = new URL(route.request().url());
    const response = await route.fetch({ url: `${BACKEND}${url.pathname}${url.search}` });
    await route.fulfill({ response });
  });
  const page = await context.newPage();
  const calls = [];
  page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text().slice(0, 200)); });
  page.on('pageerror', (e) => console.log('pageerror:', String(e.message).slice(0, 200)));
  page.on('response', (r) => {
    if (r.url().includes('/notifications/push')) calls.push(`${r.request().method()} ${r.status()} ${new URL(r.url()).pathname}`);
  });
  await page.goto(`${LOCAL}/en/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email').fill('qa-pro-matrix@claw.local');
  await page.getByLabel('Password', { exact: true }).fill('QaPlan123!xyz');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.waitForURL(/\/en\/(dashboard|chat)/, { timeout: 60000 });
  page.on('request', (r) => { if (r.method() === 'POST' && r.url().includes('/push/subscriptions')) console.log('endpoint host:', new URL(JSON.parse(r.postData()).endpoint).host); });
  await page.goto(`${LOCAL}/en/settings`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(6000);
  const row = page.getByTestId('notification-push-row');
  const visible = await row.isVisible().catch(() => false);
  console.log('push row visible:', visible);
  await page.screenshot({
    path: 'D:/Freelance/Claw/apps/claw-frontend/scripts/responsive-audit/out/push-settings.png',
  });
  console.log('permission:', await page.evaluate(() => Notification.permission));
  console.log('row text:', JSON.stringify(await row.innerText().catch(() => '')));
  if (visible) {
    const control = page.locator('#notification-push');
    await control.scrollIntoViewIfNeeded();
    await control.click({ timeout: 8000 });
    await page.waitForTimeout(5000);
    console.log('toast:', JSON.stringify(await page.locator('[role="status"], [data-sonner-toast], li[role="status"]').allInnerTexts()));
    console.log('after on:', await control.getAttribute('aria-checked'));
    // Ask auth-service to notify this user the way threads-service does, then read what the worker showed.
    const userId = execFileSync('docker', ['exec', 'claw-pg-auth', 'psql', '-U', 'claw', '-d', 'claw_auth', '-tAc', "select id from users where email='qa-pro-matrix@claw.local'"]).toString().trim();
    const payload = JSON.stringify({ pattern: 'user.notification_requested', data: { dedupeKey: `push-check:${Date.now()}`, userId, kind: 'THREAD_PUBLISHED', link: '/threads', params: { title: 'Push check' } }, timestamp: new Date().toISOString(), source: 'push-check' });
    execFileSync('docker', ['exec', 'claw-rabbitmq', 'sh', '-c', `rabbitmqadmin -u "$RABBITMQ_DEFAULT_USER" -p "$RABBITMQ_DEFAULT_PASS" publish exchange=claw.events routing_key=user.notification_requested payload='${payload}'`]);
    await page.waitForTimeout(6000);
    console.log('subscription last_used_at:', execFileSync('docker', ['exec', 'claw-pg-auth', 'psql', '-U', 'claw', '-d', 'claw_auth', '-tAc', `select coalesce(last_used_at::text,'never') from push_subscriptions where user_id='${userId}'`]).toString().trim());
    // The browser vendor's push service delivers in its own time; poll for up to 40 s.
    let shown = [];
    for (let attempt = 0; attempt < 20 && shown.length === 0; attempt += 1) {
      shown = await page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        const list = await registration.getNotifications();
        return list.map((n) => ({ title: n.title, body: n.body, path: n.data && n.data.path }));
      });
      if (shown.length === 0) await page.waitForTimeout(2000);
    }
    console.log('notifications shown by the worker:', JSON.stringify(shown));
    await control.click();
    await page.waitForTimeout(3000);
    console.log('after off:', await control.getAttribute('aria-checked'));
  }
  console.log(calls.join('\n'));
  await context.close();
  fs.rmSync(profile, { recursive: true, force: true });
}

main().catch((e) => {
  console.log('ERR', String(e.message).slice(0, 300));
  process.exit(1);
});
