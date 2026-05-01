/**
 * SCREEN capability provider (Stream 21).
 *
 * Real-shape implementation with cross-OS screencapture via shell-out:
 *   - macOS: `screencapture -x /tmp/file.png`
 *   - Linux X11: `import /tmp/file.png` (ImageMagick) or `gnome-screenshot -f`
 *   - Linux Wayland: `grim /tmp/file.png`
 *   - Windows: `powershell -Command "Add-Type -AssemblyName System.Drawing; ..."`
 *
 * OCR (TEXT extraction) requires whisper-vision / tesseract; if neither
 * binary is on PATH, the provider returns a typed error so the operator
 * can install one:
 *     # macOS / Linux:  brew install tesseract  /  apt-get install tesseract-ocr
 *     # Windows:        choco install tesseract
 *
 * Operations: CAPTURE_FULLSCREEN, CAPTURE_REGION (placeholder), OCR
 *
 * Per-OS permission flow (the user-facing dialog):
 *   - macOS: System Settings → Privacy → Screen Recording → ClawAgent
 *   - Linux PipeWire: portal handshake fires automatically on Wayland
 *   - Windows: no separate permission needed
 *
 * The screenshot blob is base64-encoded in the response and never written
 * to disk persistently — the temp file is cleaned up immediately.
 */

import { exec } from 'node:child_process';
import { Buffer } from 'node:buffer';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { getPlatform } from '../../config/paths.js';

const execAsync = promisify(exec);

const SCREEN_MAX_BYTES = 16 * 1024 * 1024; // 16 MB

export const screenProvider = {
  async execute({ operation }) {
    switch (operation) {
      case 'CAPTURE_FULLSCREEN':
        return captureFullscreenOp();
      case 'OCR':
        return ocrOp();
      default:
        throw new Error(`SCREEN provider received unsupported operation: ${operation}`);
    }
  },
};

async function captureFullscreenOp() {
  const dir = await mkdtemp(join(tmpdir(), 'claw-screen-'));
  const file = join(dir, 'capture.png');
  try {
    await screencapture(file);
    const buf = await readFile(file);
    if (buf.length > SCREEN_MAX_BYTES) {
      throw new Error('SCREEN.CAPTURE_FULLSCREEN: image exceeds 16MB');
    }
    return {
      output: {
        contentBase64: Buffer.from(buf).toString('base64'),
        mimeType: 'image/png',
        size: buf.length,
      },
      noUndoReason: 'read_only_no_state_change',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function screencapture(filePath) {
  const platform = getPlatform();
  if (platform === 'macos') {
    await execAsync(`screencapture -x ${quote(filePath)}`);
    return;
  }
  if (platform === 'linux') {
    // Prefer Wayland (grim), fallback to ImageMagick `import`
    try {
      await execAsync(`grim ${quote(filePath)}`);
      return;
    } catch {
      await execAsync(`import -window root ${quote(filePath)}`);
      return;
    }
  }
  if (platform === 'windows') {
    const ps =
      `Add-Type -AssemblyName System.Drawing; ` +
      `$bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen; ` +
      `$bmp = New-Object Drawing.Bitmap $bounds.Width, $bounds.Height; ` +
      `$gfx = [Drawing.Graphics]::FromImage($bmp); ` +
      `$gfx.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bmp.Size); ` +
      `$bmp.Save('${filePath.replace(/'/g, "''")}', 'Png'); ` +
      `$gfx.Dispose(); $bmp.Dispose();`;
    await execAsync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; ${ps}"`);
    return;
  }
  throw new Error(`SCREEN: unsupported platform ${platform}`);
}

async function ocrOp() {
  // OCR pipeline: capture fullscreen, then run tesseract. Bail with a
  // clear error if tesseract isn't installed.
  let captureResult;
  try {
    captureResult = await captureFullscreenOp();
  } catch (error) {
    throw new Error(`SCREEN.OCR: capture failed — ${(error instanceof Error && error.message) || 'unknown'}`);
  }
  const dir = await mkdtemp(join(tmpdir(), 'claw-ocr-'));
  const png = join(dir, 'in.png');
  const txt = join(dir, 'out');
  try {
    const { writeFile } = await import('node:fs/promises');
    await writeFile(png, Buffer.from(captureResult.output.contentBase64, 'base64'));
    try {
      await execAsync(`tesseract ${quote(png)} ${quote(txt)} -l eng`);
    } catch (error) {
      throw new Error(
        `SCREEN.OCR: tesseract not installed or failed. Install with 'brew install tesseract' / 'apt-get install tesseract-ocr' / 'choco install tesseract'. Detail: ${(error instanceof Error && error.message) || 'unknown'}`,
      );
    }
    const text = await readFile(`${txt}.txt`, 'utf8');
    return {
      output: { text: text.slice(0, 100_000), length: text.length },
      noUndoReason: 'read_only_no_state_change',
    };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function quote(s) {
  // Naive shell quoting — paths come from mkdtemp which gives safe names.
  return `"${s.replace(/"/g, '\\"')}"`;
}
