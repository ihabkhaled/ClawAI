/**
 * Model-conformance screen for the ClawAI coding agent.
 *
 * Drives the real extension in a real VS Code (served by `code serve-web`)
 * through a browser, one model at a time, with a prompt that can only be
 * satisfied by calling a tool. What it measures is not model intelligence but
 * whether a model can drive the agent at all: does it emit a tool request the
 * runtime accepts, and does the runtime execute it.
 *
 * Run the server first:
 *   code serve-web --without-connection-token --accept-server-license-terms \
 *     --port 9888 --host 127.0.0.1 --server-data-dir <dir> \
 *     --default-folder d:/Freelance/Claw
 *
 * VS Code for the web keeps its settings and secrets in browser storage, not on
 * the server, so a throwaway Chromium profile is a fresh unconnected install.
 * This uses a persistent profile and performs the real PKCE browser sign-in once
 * on first use; every later run inherits it. Credentials come from
 * CLAW_LAB_EMAIL and CLAW_LAB_PASSWORD so none are written down here.
 */
import { writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { argv, env } from 'node:process';

// The monorepo does not hoist Playwright, and this script lives outside the
// workspace that owns it, so the dependency is resolved from that workspace
// explicitly rather than left to bare-specifier lookup from here.
const { chromium } = createRequire(import.meta.url)(
  '../../../apps/claw-coding-agent/node_modules/@playwright/test',
);

const SERVE_WEB = 'http://127.0.0.1:9888/?folder=d:/Freelance/Claw';
const PER_MODEL_TIMEOUT_MS = 120_000;
const POLL_MS = 2_000;

// One tool call is enough to answer, and no amount of reasoning can substitute
// for it. A model that narrates instead of calling has failed the screen.
const SCREEN_PROMPT =
  'Use your workspace tools to list the entries in the repository root directory. ' +
  'Then reply with only the number of entries you found. Do not describe what you are about to do.';

const CLOUD_MODELS = [
  'OLLAMA:kimi-k2.7-code:cloud',
  'OLLAMA:kimi-k2.6:cloud',
  'OLLAMA:deepseek-v4-flash',
  'OLLAMA:deepseek-v4-pro',
  'OLLAMA:gemma4:31b',
  'OLLAMA:glm-5.1',
  'OLLAMA:glm-5.2',
  'OLLAMA:gpt-oss:120b',
  'OLLAMA:gpt-oss:20b',
  'OLLAMA:kimi-k2.5',
  'OLLAMA:kimi-k2.6',
  'OLLAMA:kimi-k2.7-code',
  'OLLAMA:kimi-k3',
  'OLLAMA:minimax-m2.5',
  'OLLAMA:minimax-m2.7',
  'OLLAMA:minimax-m3',
  'OLLAMA:mistral-large-3:675b',
  'OLLAMA:nemotron-3-nano:30b',
  'OLLAMA:nemotron-3-super',
  'OLLAMA:nemotron-3-ultra',
  'OLLAMA:qwen3.5:397b',
];

/**
 * The ClawAI panel's webview. It is not always inside `.part.sidebar` — a fresh
 * window can place it in the auxiliary bar — so it is found by being the only
 * ClawAI webview present rather than by where it happens to be docked.
 */
function panelView(page) {
  return page
    .locator('iframe.webview')
    .first()
    .contentFrame()
    .locator('iframe#active-frame')
    .contentFrame();
}

/**
 * Completes the real browser authorization flow when the gate is showing.
 *
 * The consent page passes through a transient "Authenticating..." state and may
 * land on either the login form or the consent button depending on whether the
 * profile already holds a session, so this polls for whichever state appears
 * instead of assuming an order. Sampling the page once, immediately, is how an
 * earlier version concluded the flow had stalled when it had not yet started.
 */
async function ensureConnected(page) {
  const view = panelView(page);
  const gateVisible = await view
    .locator('#connectButton')
    .isVisible({ timeout: 15_000 })
    .catch(() => false);
  if (!gateVisible) return 'already-connected';

  const email = env.CLAW_LAB_EMAIL;
  const password = env.CLAW_LAB_PASSWORD;
  if (email === undefined || password === undefined) {
    throw new Error('Set CLAW_LAB_EMAIL and CLAW_LAB_PASSWORD to let the harness sign in');
  }

  await view.locator('#connectButton').click();
  await page
    .locator('.monaco-dialog-box .monaco-button', { hasText: 'Open' })
    .click({ timeout: 20_000 })
    .catch(() => undefined);

  const authPage = await page.context().waitForEvent('page', { timeout: 30_000 });
  await authPage.waitForLoadState('domcontentloaded');

  const deadline = Date.now() + 150_000;
  let signedIn = false;
  while (Date.now() < deadline) {
    if (await panelView(page).locator('#modelSelect').isVisible().catch(() => false)) {
      await authPage.close().catch(() => undefined);
      return 'connected';
    }
    if (!signedIn) {
      const emailBox = authPage.getByRole('textbox', { name: 'Email' });
      if (await emailBox.isVisible().catch(() => false)) {
        await emailBox.fill(email);
        await authPage.getByRole('textbox', { name: 'Password' }).fill(password);
        await authPage.getByRole('button', { name: 'Sign In' }).click();
        signedIn = true;
        await authPage.waitForTimeout(3_000);
        continue;
      }
    }
    const consent = authPage.getByRole('button', { name: 'Authorize VS Code' });
    if (await consent.isVisible().catch(() => false)) {
      await consent.click().catch(() => undefined);
      await authPage.waitForTimeout(3_000);
      continue;
    }
    await authPage.waitForTimeout(2_000);
  }
  throw new Error(`authorization did not complete; last auth URL ${authPage.url()}`);
}

/**
 * Grants Workspace Trust in this browser profile.
 *
 * The trust decision is per profile, and the extension refuses workspace reads
 * without it. A fresh harness profile therefore reproduces a `workspace.files`
 * failure that looks exactly like a broken tool — 166 bytes, 23 ms — and is
 * really a policy denial. Granting it here is what makes a model-conformance
 * result about the model.
 */
async function ensureTrusted(page) {
  await page.keyboard.press('Control+Shift+P');
  await page.waitForTimeout(700);
  await page.keyboard.type('Workspaces: Manage Workspace Trust');
  await page.waitForTimeout(900);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2_500);
  for (const label of ['Trust', 'Trust Workspace', 'Yes, I trust the authors']) {
    const button = page.locator('.monaco-button, button', { hasText: new RegExp(`^${label}$`, 'u') }).first();
    if (await button.isVisible().catch(() => false)) {
      await button.click().catch(() => undefined);
      await page.waitForTimeout(1_500);
      break;
    }
  }
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  return panelView(page)
    .locator('#trustBadge')
    .innerText()
    .catch(() => 'unknown');
}

function classify(text) {
  const lower = text.toLowerCase();
  if (/·\s*(succeeded|failed)\b/u.test(text) === false && /unrepairable/u.test(lower)) {
    return 'FAIL_PROTOCOL_UNREPAIRABLE';
  }
  if (lower.includes('unrepairable')) return 'FAIL_PROTOCOL_UNREPAIRABLE';
  if (lower.includes('could not act on')) return 'FAIL_PROTOCOL_UNREPAIRABLE';
  if (/succeeded ·/u.test(text)) return 'PASS_TOOL_EXECUTED';
  if (/failed ·/u.test(text)) return 'FAIL_TOOL_EXECUTION';
  if (lower.includes('runtime state is unavailable')) return 'FAIL_RUNTIME_STATE';
  if (lower.includes('cancelled')) return 'CANCELLED';
  if (lower.includes('timed out')) return 'FAIL_TIMEOUT';
  if (/\berror\b/u.test(lower)) return 'FAIL_ERROR';
  // Ran to a terminal state with no tool receipt at all.
  return 'FAIL_NO_TOOL_CALL';
}

async function runModel(page, modelKey) {
  const view = panelView(page);
  await view.locator('#newChatButton').click().catch(() => undefined);
  await page.waitForTimeout(800);

  await view.locator('#modelSelect').evaluate((select, value) => {
    const target = select;
    target.value = value;
    target.dispatchEvent(new Event('change', { bubbles: true }));
  }, modelKey);
  await page.waitForTimeout(400);

  const selected = await view.locator('#modelSelect').inputValue();
  if (selected !== modelKey) {
    return { modelKey, outcome: 'SKIPPED_NOT_SELECTABLE', detail: `select held ${selected}`, ms: 0 };
  }

  await view.locator('#prompt').fill(SCREEN_PROMPT);
  const startedAt = Date.now();
  await view.locator('#sendButton').click();

  let tail = '';
  while (Date.now() - startedAt < PER_MODEL_TIMEOUT_MS) {
    await page.waitForTimeout(POLL_MS);
    const state = await view.locator('body').evaluate((body) => {
      const items = body.querySelectorAll('#conversation .timeline-item');
      const last = items[items.length - 1];
      const deck = body.querySelector('#runDeckCount');
      return {
        running: deck === null ? '' : deck.textContent ?? '',
        tail: last === undefined ? '' : (last.textContent ?? '').replace(/\s+/gu, ' '),
      };
    });
    tail = state.tail;
    if (!state.running.startsWith('0')) continue;
    // The deck is empty and the assistant has spoken: this run is terminal.
    if (tail.length > 0) break;
  }

  const ms = Date.now() - startedAt;
  // Only cancel something still running. Clicking unconditionally stamped
  // "cancelled" onto runs that had already finished on their own.
  const stillRunning = await view
    .locator('#runDeckCount')
    .innerText()
    .then((value) => !value.startsWith('0'))
    .catch(() => false);
  if (stillRunning) {
    await view.locator('#activeRunList button').first().click().catch(() => undefined);
    await page.waitForTimeout(1_500);
  }
  return { modelKey, outcome: classify(tail), detail: tail.slice(-500), ms };
}

const only = argv.slice(2).filter((value) => !value.startsWith('--'));
const models = only.length > 0 ? only : CLOUD_MODELS;

const profileDir = env.CLAW_LAB_PROFILE ?? './.lab-browser-profile';
const context = await chromium.launchPersistentContext(profileDir, {
  headless: true,
  viewport: { width: 1600, height: 1000 },
});
const page = context.pages()[0] ?? (await context.newPage());
await page.goto(SERVE_WEB, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(30_000);
await page.locator('.activitybar .action-label[aria-label="ClawAI"]').click();
await page.waitForTimeout(5_000);
process.stdout.write(`session: ${await ensureConnected(page)}
trust: ${await ensureTrusted(page)}
`);

const results = [];
for (const modelKey of models) {
  let result;
  try {
    result = await runModel(page, modelKey);
  } catch (error) {
    result = {
      modelKey,
      outcome: 'HARNESS_ERROR',
      detail: error instanceof Error ? error.message.slice(0, 300) : String(error),
      ms: 0,
    };
  }
  results.push(result);
  process.stdout.write(
    `${result.outcome.padEnd(28)} ${String(Math.round(result.ms / 1000)).padStart(4)}s  ${result.modelKey}\n`,
  );
  writeFileSync('docs/16-quality-engineering/coding-agent-lab/evidence/model-matrix-latest.json', `${JSON.stringify(results, null, 2)}\n`);
}

await context.close();

const passed = results.filter((entry) => entry.outcome === 'PASS_TOOL_EXECUTED');
process.stdout.write(`\n${String(passed.length)}/${String(results.length)} executed a tool\n`);
for (const entry of passed) process.stdout.write(`  PASS ${entry.modelKey}\n`);
