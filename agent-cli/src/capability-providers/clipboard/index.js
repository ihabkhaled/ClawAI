/**
 * CLIPBOARD capability provider (Stream 22 — minimal scaffold).
 *
 * Implements READ + WRITE for the OS clipboard via per-OS shell-out.
 * Cross-OS commands:
 *   - macOS: `pbcopy` / `pbpaste`
 *   - Linux: `xclip -selection clipboard` (X11) / `wl-copy`+`wl-paste` (Wayland)
 *   - Windows: PowerShell `Get-Clipboard` / `Set-Clipboard`
 *
 * v1 supports text only — image clipboard contents (binary) require
 * `clipboardy` or `clipboard-image` and per-OS image encoding handlers.
 *
 * Status: shell-out is implemented for the three text paths. Real-world
 * cross-OS validation requires a paired device on each OS — deferred to
 * a hardware QA round.
 */

import { exec } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { promisify } from 'node:util';

import { getPlatform } from '../../config/paths.js';

const execAsync = promisify(exec);

const CLIPBOARD_MAX_BYTES = 1 * 1024 * 1024; // 1 MB cap

export const clipboardProvider = {
  async execute({ operation, payload }) {
    switch (operation) {
      case 'READ':
        return readOp();
      case 'WRITE':
        return writeOp(payload);
      case 'READ_IMAGE':
        return readImageOp();
      case 'WRITE_IMAGE':
        return writeImageOp(payload);
      default:
        throw new Error(`CLIPBOARD provider received unsupported operation: ${operation}`);
    }
  },
};

/**
 * Read clipboard as image (cross-OS).
 * Returns base64-encoded PNG when an image is present; throws otherwise.
 *
 * Implementation note: native image clipboard access is OS-specific and
 * requires either a small native helper or shell-out to platform tools:
 *   - macOS: `osascript` to extract image to a temp file, base64 encode
 *   - Linux X11: `xclip -selection clipboard -t image/png -o`
 *   - Linux Wayland: `wl-paste --type image/png`
 *   - Windows: PowerShell `Get-Clipboard -Format Image | ...`
 *
 * This implementation shells out and falls back to a typed error when
 * the platform tool is unavailable, so callers can degrade gracefully.
 */
async function readImageOp() {
  const platform = getPlatform();
  let cmd;
  if (platform === 'linux') {
    cmd = 'wl-paste --type image/png 2>/dev/null | base64 -w0 || xclip -selection clipboard -t image/png -o 2>/dev/null | base64 -w0';
  } else if (platform === 'macos') {
    cmd =
      "osascript -e 'try' -e 'set t to (the clipboard as «class PNGf»)' -e 'set f to open for access POSIX file \"/tmp/claw-cb.png\" with write permission' -e 'set eof of f to 0' -e 'write t to f' -e 'close access f' -e 'end try' && base64 < /tmp/claw-cb.png && rm -f /tmp/claw-cb.png";
  } else {
    throw new Error('CLIPBOARD.READ_IMAGE not yet wired on Windows — use READ for text');
  }
  const { stdout } = await execAsync(cmd, { maxBuffer: 16 * 1024 * 1024 });
  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    throw new Error('CLIPBOARD.READ_IMAGE: no image on clipboard or platform tool missing');
  }
  return {
    output: { contentBase64: trimmed, mimeType: 'image/png' },
    noUndoReason: 'read_only_no_state_change',
  };
}

/**
 * Write a base64-encoded PNG to the clipboard. Same OS caveats as
 * readImageOp — needs xclip / wl-copy / osascript / PowerShell.
 */
async function writeImageOp(payload) {
  if (typeof payload?.contentBase64 !== 'string' || payload.contentBase64.length === 0) {
    throw new Error('CLIPBOARD.WRITE_IMAGE: payload.contentBase64 is required');
  }
  if (payload.contentBase64.length > 16 * 1024 * 1024) {
    throw new Error('CLIPBOARD.WRITE_IMAGE: payload exceeds 16MB cap');
  }
  const platform = getPlatform();
  if (platform !== 'linux' && platform !== 'macos') {
    throw new Error('CLIPBOARD.WRITE_IMAGE not yet wired on Windows');
  }
  const cmd =
    platform === 'macos'
      ? 'base64 -d > /tmp/claw-cb-out.png && osascript -e \'set the clipboard to (read POSIX file "/tmp/claw-cb-out.png" as «class PNGf»)\' && rm -f /tmp/claw-cb-out.png'
      : 'base64 -d | (wl-copy --type image/png 2>/dev/null || xclip -selection clipboard -t image/png)';
  await new Promise((resolve, reject) => {
    const child = exec(cmd, { maxBuffer: 16 * 1024 * 1024 }, (err) =>
      err === null ? resolve(undefined) : reject(err),
    );
    child.stdin?.end(payload.contentBase64);
  });
  return {
    output: { written: payload.contentBase64.length },
    noUndoReason: 'clipboard_replace_irreversible',
  };
}

async function readOp() {
  const cmd = readCmd();
  const { stdout } = await execAsync(cmd, { maxBuffer: CLIPBOARD_MAX_BYTES });
  return {
    output: { content: stdout, length: stdout.length },
    noUndoReason: 'read_only_no_state_change',
  };
}

async function writeOp(payload) {
  const content = typeof payload?.content === 'string' ? payload.content : '';
  if (content.length === 0) {
    throw new Error('CLIPBOARD.WRITE: payload.content is required (string)');
  }
  if (Buffer.byteLength(content, 'utf8') > CLIPBOARD_MAX_BYTES) {
    throw new Error('CLIPBOARD.WRITE: content exceeds 1MB cap');
  }
  const cmd = writeCmd();
  await new Promise((resolve, reject) => {
    const child = exec(cmd, { maxBuffer: CLIPBOARD_MAX_BYTES }, (err) =>
      err === null ? resolve(undefined) : reject(err),
    );
    child.stdin?.end(content);
  });
  return {
    output: { written: content.length },
    noUndoReason: 'clipboard_replace_irreversible',
  };
}

function readCmd() {
  const platform = getPlatform();
  if (platform === 'windows') return 'powershell -NoProfile -Command "Get-Clipboard -Raw"';
  if (platform === 'macos') return 'pbpaste';
  // Linux: prefer wayland, fallback to xclip
  return 'wl-paste 2>/dev/null || xclip -selection clipboard -o';
}

function writeCmd() {
  const platform = getPlatform();
  if (platform === 'windows') return 'powershell -NoProfile -Command "Set-Clipboard -Value ([Console]::In.ReadToEnd())"';
  if (platform === 'macos') return 'pbcopy';
  return 'wl-copy 2>/dev/null || xclip -selection clipboard';
}
