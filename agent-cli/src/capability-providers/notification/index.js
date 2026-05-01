/**
 * NOTIFICATION capability provider (Stream 22 — minimal scaffold).
 *
 * Sends OS-native desktop notifications. Cross-OS via shell-out:
 *   - macOS: `osascript -e 'display notification ...'`
 *   - Linux: `notify-send` (libnotify)
 *   - Windows: PowerShell `New-BurntToastNotification` (requires module)
 *     fallback: `msg *` for fully-stock systems
 *
 * Notifications are IRREVERSIBLE — `noUndoReason` always set.
 *
 * Status: shell-out shape is implemented. Production hardening still
 * needed: HTML escaping for the body, action buttons (per-OS APIs
 * differ wildly), do-not-disturb detection.
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';

import { getPlatform } from '../../config/paths.js';

const execAsync = promisify(exec);

const NOTIFY_TITLE_MAX = 200;
const NOTIFY_BODY_MAX = 2000;

export const notificationProvider = {
  async execute({ operation, payload }) {
    if (operation !== 'NOTIFY') {
      throw new Error(`NOTIFICATION provider received unsupported operation: ${operation}`);
    }
    const title = sanitiseString(payload?.title, NOTIFY_TITLE_MAX, 'title');
    const body = sanitiseString(payload?.body ?? '', NOTIFY_BODY_MAX, 'body');
    await dispatch(title, body);
    return {
      output: { delivered: true, title, bodyLength: body.length },
      noUndoReason: 'notification_already_displayed',
    };
  },
};

function sanitiseString(value, maxLen, label) {
  if (typeof value !== 'string') {
    throw new Error(`NOTIFICATION.NOTIFY: payload.${label} must be a string`);
  }
  if (value.length > maxLen) {
    throw new Error(`NOTIFICATION.NOTIFY: payload.${label} exceeds ${String(maxLen)} chars`);
  }
  return value;
}

async function dispatch(title, body) {
  const platform = getPlatform();
  // Escape single quotes in the strings being passed to the shell
  const safeTitle = title.replace(/'/g, "'\\''");
  const safeBody = body.replace(/'/g, "'\\''");
  if (platform === 'macos') {
    await execAsync(`osascript -e 'display notification "${safeBody}" with title "${safeTitle}"'`);
    return;
  }
  if (platform === 'linux') {
    await execAsync(`notify-send '${safeTitle}' '${safeBody}'`);
    return;
  }
  if (platform === 'windows') {
    // Stock fallback — msg * works on most Windows installs without extra modules
    await execAsync(`msg * "${safeTitle}: ${safeBody}"`);
    return;
  }
  throw new Error(`NOTIFICATION.NOTIFY: unsupported platform ${platform}`);
}
