import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// The enforcement mechanism named by rules/40-chat-surface-layout-and-composer.md.
//
// The rest of this batch's tests assert behaviour through rendered components,
// which is the right level for behaviour and the wrong level for a layout
// contract: a rendered header does not have a width in jsdom, so no amount of
// component testing can catch a fixed pixel height reappearing on the composer
// or a `min-h-0` being dropped from the transcript. Those two regressions are
// invisible until somebody opens the page at 1366x768, which is rarely.
//
// So this reads the source text. It is a blunt check on purpose — it asserts
// the handful of literal decisions the layout stands on, and nothing about how
// the components are written otherwise.
const CHAT_COMPONENTS = resolve(__dirname, '..');
const SHELL = resolve(CHAT_COMPONENTS, 'chat-thread-shell.tsx');
const COMPOSER = resolve(CHAT_COMPONENTS, 'message-composer.tsx');
const TOOLBAR = resolve(CHAT_COMPONENTS, 'composer-toolbar.tsx');

// Tailwind arbitrary heights (`h-[600px]`, `max-h-[50vh]`, `min-h-[80px]`) and
// inline style heights. Rule 40 §2: growth is bounded in rows or dvh, never in
// pixels, because a pixel height is a number something other than the content
// had to choose.
const ARBITRARY_HEIGHT = /\b(?:max-|min-)?h-\[[^\]]*(?:px|rem|vh)[^\]]*\]/g;
const INLINE_HEIGHT = /(?:height|maxHeight|minHeight)\s*:/g;

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('chat surface layout contract (rules/40)', () => {
  it('puts no fixed height on the shell, the composer or the toolbar', () => {
    for (const file of [SHELL, COMPOSER, TOOLBAR]) {
      const source = read(file);
      expect(source.match(ARBITRARY_HEIGHT) ?? []).toEqual([]);
      expect(source.match(INLINE_HEIGHT) ?? []).toEqual([]);
    }
  });

  it('keeps the transcript as the only element that grows', () => {
    const shell = read(SHELL);
    // Without min-h-0 a flex child will not shrink below its content, and the
    // transcript pushes the composer off the bottom of the viewport instead of
    // scrolling. This is the single most repeated flexbox mistake on this page.
    expect(shell).toContain('min-h-0 flex-1 overflow-hidden');
    expect(shell).toContain('flex h-full min-h-0 flex-col');
  });

  it('binds the reading column to the shared token, not to a local value', () => {
    // Transcript and composer share one bound so they cannot drift apart.
    expect(read(SHELL)).toContain('chat-content-column');
    expect(read(resolve(__dirname, '../../../app/globals.css'))).toContain('--chat-content-max');
  });

  it('renders one control row, not a mobile row and a desktop row', () => {
    // `md:hidden` / `hidden md:flex` twin rows mount every picker, popover and
    // query behind them twice. Rule 40 §9 — the variant is a prop resolved from
    // a media query, which is why the toolbar file has no breakpoint branches.
    const toolbar = read(TOOLBAR);
    expect(toolbar).not.toMatch(/\bmd:hidden\b/);
    expect(toolbar).not.toMatch(/\bhidden\s+md:flex\b/);
  });

  it('turns off the textarea drag handle the shared component enables', () => {
    // RichPromptTextarea defaults to `resize-y` and latches "user resized, stop
    // autosizing". That is right in the compare dialog and wrong here: it is
    // how the old composer reached a state the user could not undo.
    expect(read(COMPOSER)).toContain('resize-none');
  });

  it('keeps the composer registered as a rail obstacle', () => {
    // The floating feedback launcher measures this to avoid landing on the
    // composer's controls. See rules/36-floating-ui-and-toast-clearance.md.
    expect(read(COMPOSER)).toContain('data-rail-obstacle');
  });
});
