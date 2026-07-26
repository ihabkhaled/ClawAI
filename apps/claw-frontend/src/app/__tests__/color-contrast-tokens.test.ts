import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// Guards the property "every semantic colour pair we use as TEXT clears WCAG AA".
//
// This exists because the Lighthouse CI gate asserts `color-contrast` across every
// public marketing URL, axe scores the whole audit 0 for a single failing element,
// and the failure surfaces as "4 pages are broken" with no indication of which
// token caused it. A token nudged by 3% of lightness in globals.css is invisible in
// review and turns the build red for everyone.
//
// It caught a real regression: `--muted-foreground` at the shadcn default 46.9%
// computes to 4.34:1 on `bg-muted` — fine for large text (3:1), under AA for normal
// text (4.5:1). Only the pages using the pair at `text-xs` failed.

const GLOBALS_CSS = join(__dirname, '..', 'globals.css');

/** WCAG AA for normal-size text. Large text (>=24px, or >=18.66px bold) needs 3.0. */
const AA_NORMAL_TEXT = 4.5;

type Hsl = { h: number; s: number; l: number };

function parseToken(css: string, name: string, blockStart: number): Hsl {
  // Reads the FIRST definition at or after `blockStart`, so the light-mode block
  // (`:root`) and the dark-mode block (`.dark`) can be read independently even
  // though they declare the same token names.
  const pattern = new RegExp(`--${name}:\\s*([\\d.]+)\\s+([\\d.]+)%\\s+([\\d.]+)%`, 'u');
  const match = pattern.exec(css.slice(blockStart));
  if (match === null) {
    throw new Error(`token --${name} not found after offset ${String(blockStart)}`);
  }
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
}

function toRgb({ h, s, l }: Hsl): [number, number, number] {
  const saturation = s / 100;
  const lightness = l / 100;
  const a = saturation * Math.min(lightness, 1 - lightness);
  const channel = (n: number): number => {
    const k = (n + h / 30) % 12;
    return lightness - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
  };
  return [Math.round(channel(0) * 255), Math.round(channel(8) * 255), Math.round(channel(4) * 255)];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const linear = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.039_28 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (linear[0] ?? 0) + 0.7152 * (linear[1] ?? 0) + 0.0722 * (linear[2] ?? 0);
}

function contrastRatio(foreground: Hsl, background: Hsl): number {
  const first = relativeLuminance(toRgb(foreground));
  const second = relativeLuminance(toRgb(background));
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Offset of a theme's token block.
 *
 * Matched on the block OPENING (`:root {` / `.dark {`), not on a bare substring:
 * the file starts with a long run of `.dark .hljs-*` syntax-highlighting rules, so
 * `indexOf('.dark')` lands hundreds of lines before the token block and every
 * "dark" assertion would silently read light-mode values.
 */
function themeBlockOffset(css: string, selector: string): number {
  const pattern = new RegExp(`^\\s*${selector.replace('.', '\\.')}\\s*\\{`, 'mu');
  const match = pattern.exec(css);
  if (match?.index === undefined) {
    throw new Error(`theme block ${selector} not found`);
  }
  return match.index;
}

describe('semantic colour tokens meet WCAG AA for text', () => {
  const css = readFileSync(GLOBALS_CSS, 'utf8');
  // Both themes declare the same token names; read each from its own block.
  const lightStart = themeBlockOffset(css, ':root');
  const darkStart = themeBlockOffset(css, '.dark');

  it('finds both theme blocks', () => {
    expect(lightStart).toBeGreaterThanOrEqual(0);
    expect(darkStart).toBeGreaterThan(lightStart);
  });

  describe.each([
    ['light', () => lightStart],
    ['dark', () => darkStart],
  ])('%s theme', (_theme, offsetOf) => {
    const offset = offsetOf();
    const background = parseToken(css, 'background', offset);
    const muted = parseToken(css, 'muted', offset);
    const card = parseToken(css, 'card', offset);
    const foreground = parseToken(css, 'foreground', offset);
    const mutedForeground = parseToken(css, 'muted-foreground', offset);

    it('foreground on background clears AA', () => {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it('muted-foreground on background clears AA', () => {
      expect(contrastRatio(mutedForeground, background)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it('muted-foreground on muted clears AA', () => {
      // The pairing that actually broke the Lighthouse gate. `bg-muted` +
      // `text-muted-foreground` on a small chip is used across the marketing pages.
      expect(contrastRatio(mutedForeground, muted)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it('muted-foreground on card clears AA', () => {
      expect(contrastRatio(mutedForeground, card)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });

    it('text-soft on muted clears AA', () => {
      // Kept in step with muted-foreground: same requirement, same surfaces.
      const soft = parseToken(css, 'text-soft', offset);
      expect(contrastRatio(soft, muted)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    });
  });

  it('keeps a margin above the threshold rather than sitting on it', () => {
    // A pair at exactly 4.50 is one rounding change away from red. The light
    // muted-on-muted pair is the tightest one we have, so it is pinned with a
    // margin: anything under 4.6 means somebody has shaved the buffer off.
    const background = parseToken(css, 'muted', lightStart);
    const mutedForeground = parseToken(css, 'muted-foreground', lightStart);
    expect(contrastRatio(mutedForeground, background)).toBeGreaterThan(4.6);
  });
});
