/**
 * APPLICATION capability provider (Stream 23).
 *
 * Real implementation using @nut-tree/nut-js for cross-OS UI automation.
 * Lazy-imports the package; if missing, throws a typed error instructing
 * the operator to install it (~70 MB native bindings per platform).
 *
 *     npm i @nut-tree/nut-js -w agent-cli
 *
 * Operations:
 *   LAUNCH       — start an application by absolute binary path
 *   FOCUS        — bring a window to front by title-regex
 *   CLOSE        — gracefully close a window (sends OS-native close)
 *   SEND_KEYS    — type a string into the focused window
 *   GET_STATE    — return list of visible window titles + active app
 *
 * Per-app allow-list is enforced at the policy layer
 * (`targetMatcherJson.binaryNameRegex` / `windowTitleRegex`); this
 * provider trusts the gate and just executes.
 *
 * Risk note: every operation here has high blast radius (driving the
 * user's UI). Recipes targeting this class should default to
 * blastRadius=USER_SCOPE so the human stays in the loop.
 */

import { spawn } from 'node:child_process';
import { Buffer } from 'node:buffer';

const APP_TIMEOUT_MS = 30_000;
const KEYS_MAX_LEN = 4096;

let cachedNut = null;

async function getNut() {
  if (cachedNut !== null) return cachedNut;
  try {
    cachedNut = await import('@nut-tree/nut-js');
  } catch (error) {
    throw new Error(
      `APPLICATION provider requires @nut-tree/nut-js. Install with: npm i @nut-tree/nut-js -w agent-cli. Detail: ${(error && error.message) || 'module not found'}`,
    );
  }
  return cachedNut;
}

export const applicationProvider = {
  async execute({ operation, target, payload }) {
    switch (operation) {
      case 'LAUNCH':
        return launchOp(target, payload);
      case 'FOCUS':
        return focusOp(target);
      case 'CLOSE':
        return closeOp(target);
      case 'SEND_KEYS':
        return sendKeysOp(target, payload);
      case 'GET_STATE':
        return getStateOp();
      default:
        throw new Error(`APPLICATION provider received unsupported operation: ${operation}`);
    }
  },
};

async function launchOp(target, payload) {
  const binary = requireBinary(target?.binary);
  const args = Array.isArray(target?.args) ? target.args.map(String).slice(0, 64) : [];
  const cwd = typeof payload?.cwd === 'string' ? payload.cwd : undefined;
  const child = spawn(binary, args, {
    cwd,
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();
  return {
    output: { launched: binary, pid: child.pid ?? null },
    noUndoReason: 'application_launch_irreversible',
  };
}

async function focusOp(target) {
  const titleRegex = requireTitleRegex(target?.windowTitleRegex);
  const nut = await getNut();
  const windows = await nut.getWindows();
  const found = await firstWindowMatching(nut, windows, titleRegex);
  if (found === null) {
    throw new Error(`APPLICATION.FOCUS: no window matched ${titleRegex.source}`);
  }
  await found.focus();
  const finalTitle = await found.title;
  return {
    output: { focused: finalTitle },
    noUndoReason: 'window_focus_state_change',
  };
}

async function closeOp(target) {
  const titleRegex = requireTitleRegex(target?.windowTitleRegex);
  const nut = await getNut();
  const windows = await nut.getWindows();
  const found = await firstWindowMatching(nut, windows, titleRegex);
  if (found === null) {
    throw new Error(`APPLICATION.CLOSE: no window matched ${titleRegex.source}`);
  }
  await found.focus();
  // Most apps respect Cmd/Alt+F4 close shortcut
  const platform = process.platform;
  if (platform === 'darwin') {
    await nut.keyboard.pressKey(nut.Key.LeftCmd, nut.Key.Q);
    await nut.keyboard.releaseKey(nut.Key.LeftCmd, nut.Key.Q);
  } else {
    await nut.keyboard.pressKey(nut.Key.LeftAlt, nut.Key.F4);
    await nut.keyboard.releaseKey(nut.Key.LeftAlt, nut.Key.F4);
  }
  return {
    output: { closed: titleRegex.source },
    noUndoReason: 'window_close_irreversible',
  };
}

async function sendKeysOp(target, payload) {
  const text = typeof payload?.text === 'string' ? payload.text : '';
  if (text.length === 0 || text.length > KEYS_MAX_LEN) {
    throw new Error(`APPLICATION.SEND_KEYS: payload.text required (1..${String(KEYS_MAX_LEN)} chars)`);
  }
  if (target?.windowTitleRegex !== undefined) {
    await focusOp(target);
  }
  const nut = await getNut();
  nut.keyboard.config.autoDelayMs = 5;
  await nut.keyboard.type(text);
  return {
    output: { typed: text.length },
    noUndoReason: 'keystrokes_irreversible',
  };
}

async function getStateOp() {
  const nut = await getNut();
  const windows = await nut.getWindows();
  const titles = await Promise.all(
    windows.map((w) => w.title.catch(() => '')),
  );
  let activeTitle = '';
  try {
    const active = await nut.getActiveWindow();
    activeTitle = await active.title;
  } catch {
    /* no active window */
  }
  return {
    output: {
      windowTitles: titles.filter((t) => t.length > 0).slice(0, 100),
      activeWindow: activeTitle,
    },
    noUndoReason: 'read_only_no_state_change',
  };
}

async function firstWindowMatching(_nut, windows, regex) {
  for (const w of windows) {
    try {
      const title = await w.title;
      if (regex.test(title)) return w;
    } catch {
      /* continue */
    }
  }
  return null;
}

function requireBinary(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('APPLICATION: target.binary is required (string)');
  }
  if (value.length > 4096) {
    throw new Error('APPLICATION: target.binary exceeds max length');
  }
  return value;
}

function requireTitleRegex(value) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('APPLICATION: target.windowTitleRegex is required (string)');
  }
  if (value.length > 1024) {
    throw new Error('APPLICATION: target.windowTitleRegex exceeds max length');
  }
  try {
    return new RegExp(value);
  } catch (error) {
    throw new Error(`APPLICATION: target.windowTitleRegex invalid: ${(error && error.message) || ''}`);
  }
}

// Suppress unused Buffer import warning on platforms that don't need it
void Buffer;
