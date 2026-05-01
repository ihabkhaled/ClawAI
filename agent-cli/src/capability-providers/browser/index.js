/**
 * BROWSER capability provider (Stream 20).
 *
 * Real-shape Playwright integration with graceful degradation when
 * Playwright isn't installed. The provider tries to dynamically import
 * `playwright` at first use; if the module is missing, throws a typed
 * error so the operator can install it on demand:
 *     npm i playwright -w agent-cli
 *     npx playwright install chromium
 *
 * Operations: NAVIGATE, CLICK, TYPE, EXTRACT, SCREENSHOT
 *
 * Per-context state: a single Playwright browser is kept alive for the
 * agent-cli process. Each capability run gets a fresh page; pages are
 * closed at end of operation. The browser launches headed by default
 * so the user sees what the agent does.
 *
 * Security:
 *   - urlGlob / urlDenyGlob from policy.targetMatcherJson is enforced
 *     by CapabilityRiskService before this provider runs; we don't
 *     re-validate here.
 *   - Browser profile (cookies, localStorage) lives in
 *     `~/.claw-agent/browser-profile/` and is OS-encrypted via the
 *     filesystem permissions of that directory.
 */

import { resolve as resolvePath } from 'node:path';
import { homedir } from 'node:os';

const BROWSER_PROFILE_DIR = resolvePath(homedir(), '.claw-agent', 'browser-profile');

let cachedBrowser = null;

async function getBrowser() {
  if (cachedBrowser !== null) return cachedBrowser;
  let playwright;
  try {
    playwright = await import('playwright');
  } catch (error) {
    throw new Error(
      `BROWSER provider requires the 'playwright' package. Install it with: npm i playwright && npx playwright install chromium. Original error: ${(error && error.message) ?? 'module not found'}`,
    );
  }
  cachedBrowser = await playwright.chromium.launchPersistentContext(BROWSER_PROFILE_DIR, {
    headless: false,
    viewport: { width: 1280, height: 720 },
  });
  return cachedBrowser;
}

export const browserProvider = {
  async execute({ operation, target, payload }) {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      switch (operation) {
        case 'NAVIGATE':
          return await navigateOp(page, target);
        case 'CLICK':
          return await clickOp(page, target);
        case 'TYPE':
          return await typeOp(page, target, payload);
        case 'EXTRACT':
          return await extractOp(page, target);
        case 'SCREENSHOT':
          return await screenshotOp(page, target);
        default:
          throw new Error(`BROWSER provider received unsupported operation: ${operation}`);
      }
    } finally {
      await page.close().catch(() => undefined);
    }
  },
};

async function navigateOp(page, target) {
  const url = requireUrl(target?.url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const title = await page.title();
  return {
    output: { url, title, finalUrl: page.url() },
    noUndoReason: 'browser_navigation_irreversible',
  };
}

async function clickOp(page, target) {
  const url = requireUrl(target?.url);
  const selector = requireSelector(target?.selector);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.click(selector, { timeout: 10_000 });
  return {
    output: { clicked: selector, finalUrl: page.url() },
    noUndoReason: 'browser_click_irreversible',
  };
}

async function typeOp(page, target, payload) {
  const url = requireUrl(target?.url);
  const selector = requireSelector(target?.selector);
  const text = typeof payload?.text === 'string' ? payload.text : '';
  if (text.length === 0) {
    throw new Error('BROWSER.TYPE: payload.text is required (string)');
  }
  if (text.length > 10_000) {
    throw new Error('BROWSER.TYPE: payload.text exceeds 10000 chars');
  }
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.fill(selector, text, { timeout: 10_000 });
  return {
    output: { selector, charsTyped: text.length, finalUrl: page.url() },
    noUndoReason: 'browser_input_irreversible',
  };
}

async function extractOp(page, target) {
  const url = requireUrl(target?.url);
  const selector = typeof target?.selector === 'string' ? target.selector : 'body';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const text = await page.textContent(selector, { timeout: 10_000 });
  return {
    output: { selector, text: (text ?? '').slice(0, 100_000) },
    noUndoReason: 'read_only_no_state_change',
  };
}

async function screenshotOp(page, target) {
  const url = requireUrl(target?.url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const buffer = await page.screenshot({ type: 'png', fullPage: false });
  return {
    output: {
      contentBase64: Buffer.from(buffer).toString('base64'),
      mimeType: 'image/png',
      url: page.url(),
    },
    noUndoReason: 'read_only_no_state_change',
  };
}

function requireUrl(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('BROWSER: target.url is required (string)');
  }
  if (value.length > 4096) {
    throw new Error('BROWSER: target.url exceeds max length');
  }
  if (!/^https?:\/\//.test(value)) {
    throw new Error('BROWSER: target.url must start with http:// or https://');
  }
  return value;
}

function requireSelector(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('BROWSER: target.selector is required (CSS selector string)');
  }
  if (value.length > 1024) {
    throw new Error('BROWSER: target.selector exceeds max length');
  }
  return value;
}
