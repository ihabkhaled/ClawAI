#!/usr/bin/env node
// Live & Videos QA (ADR-221 batch 6, 2026-11-25): Playwright rounds through the real /live page, one per platform link: paste → Check link → note
// the capability notice → Start (play along) or Summarize → wait → count captions and feed cards in
// the modal → close. PASS when the modal shows analysis (captions or cards). Screenshots per round.
// ROUNDS=n repeats the whole list. Local stack only; tokens never printed. Mind the policy's
// sessionsPerUserPerHour (30): each round opens one session.
//   ROUND_CASES='[{"platform":"X","url":"...","summary":false}]' NODE_EXTRA_CA_CERTS=certs/rootCA.pem \n//     node --env-file=.env scripts/qa/live-platform-rounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = createRequire(
  new URL('../../apps/claw-frontend/package.json', import.meta.url),
)('playwright');

const BASE = process.env.LIVE_QA_ORIGIN ?? 'https://claw.local';
const OUT = process.env.LIVE_QA_OUT ?? join(tmpdir(), 'live-qa-rounds');
mkdirSync(OUT, { recursive: true });
const ROUNDS = Number(process.env.ROUNDS ?? 1);
const WAIT = Number(process.env.WAIT_SECONDS ?? 60);
const CASES = JSON.parse(process.env.ROUND_CASES ?? '[]');

async function storedLogin() {
  const res = await fetch(`${BASE}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
  });
  const login = await res.json();
  return JSON.stringify({
    state: {
      accessToken: login.tokens.accessToken,
      refreshToken: login.tokens.refreshToken,
      user: login.user,
      isAuthenticated: true,
      persistent: true,
    },
    version: 0,
  });
}
const browser = await chromium.launch();
const results = [];
for (let round = 1; round <= ROUNDS; round += 1) {
  for (const [index, entry] of CASES.entries()) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 860 },
      ignoreHTTPSErrors: true,
      locale: 'en',
    });
    const stored = await storedLogin();
    await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: 'claw-auth-storage',
      value: stored,
    });
    const page = await context.newPage();
    const label = `r${round}-${index}-${entry.platform}`;
    let verdict = 'FAIL';
    let detail = '';
    try {
      await page.goto(`${BASE}/en/live`, { waitUntil: 'networkidle' }).catch(() => {});
      await page.waitForTimeout(1500);
      await page.locator('#live-url').fill(entry.url);
      await page.getByRole('button', { name: /check link/i }).click();
      const notice = page.locator('[data-testid$="-notice"]').first();
      await notice.waitFor({ timeout: 90_000 });
      const noticeId = await notice.getAttribute('data-testid');
      detail = noticeId ?? '';
      if (noticeId === 'live-link-only-notice') throw new Error('link-only');
      if (entry.summary) {
        await page.getByTestId('live-summarize').click();
        await page.getByTestId('live-summary-confirm').click();
      } else {
        await page.getByRole('button', { name: /^(start|watch with live analysis)$/i }).click();
      }
      const dialog = page.locator('[role="dialog"]').first();
      await dialog.waitFor({ timeout: 30_000 });
      let captions = 0;
      let cards = 0;
      for (let second = 0; second < WAIT; second += 5) {
        await page.waitForTimeout(5000);
        await page
          .getByRole('tab', { name: /captions/i })
          .click()
          .catch(() => {});
        captions = await dialog
          .locator('p[dir="auto"]')
          .count()
          .catch(() => 0);
        cards = await dialog
          .locator('article[data-testid^="live-card-"]')
          .count()
          .catch(() => 0);
        await page
          .getByRole('tab', { name: /smart feed/i })
          .click()
          .catch(() => {});
        cards = Math.max(
          cards,
          await dialog
            .locator('article[data-testid^="live-card-"]')
            .count()
            .catch(() => 0),
        );
        if (captions > 0 && cards > 0 && second >= 20) break;
      }
      const status = await dialog
        .locator('[role="status"]')
        .first()
        .innerText()
        .catch(() => '');
      detail += ` captions=${captions} cards=${cards} status="${status.split('\n')[0]}"`;
      verdict = captions > 0 || cards > 0 ? 'PASS' : 'FAIL';
      await page.screenshot({ path: `${OUT}/${label}.png` });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(1500);
    } catch (error) {
      detail += ` ${String(error).split('\n')[0].slice(0, 140)}`;
      await page.screenshot({ path: `${OUT}/${label}-error.png` }).catch(() => {});
    }
    results.push({ label, url: entry.url, verdict, detail });
    console.log(`${verdict}  ${label}  ${entry.url}  ${detail}`);
    await context.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/results.json`, JSON.stringify(results, null, 1));
const passed = results.filter((r) => r.verdict === 'PASS').length;
console.log(`\n${passed}/${results.length} rounds passed`);
