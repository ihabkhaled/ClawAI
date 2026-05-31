// Tiny helpers for the useKeyboardShortcut hook. Pulled out so the hook stays
// small and easy to test in isolation.

export type ParsedCombo = {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
};

// Map a few human aliases onto their canonical KeyboardEvent.key form so the
// caller can write `"shift+/"` or `"mod+enter"` and have it match what the
// browser dispatches.
const KEY_ALIASES: Record<string, string> = {
  enter: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  space: ' ',
  tab: 'Tab',
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
};

// Exported so UI components can render platform-correct hint labels (⌘K on
// macOS, Ctrl K on everything else). SSR-safe — defaults to non-Mac when
// `navigator` is undefined so the first paint matches the post-hydration
// branch for most users.
export function isMac(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  return /Mac|iP(hone|ad|od)/i.test(navigator.platform);
}

// Returns the platform-specific modifier glyph for a shortcut hint pill.
// macOS gets the loop glyph; everything else gets the literal "Ctrl" string
// because Windows users don't read ⌃ as Control without the label.
export function getModKeyLabel(): string {
  return isMac() ? '⌘' : 'Ctrl';
}

function normalizeKey(raw: string): string {
  const lower = raw.toLowerCase();
  const alias = KEY_ALIASES[lower];
  if (alias !== undefined) {
    return alias;
  }
  // Single-character keys are matched case-insensitively against
  // KeyboardEvent.key, which already lowercases letters when modifier is
  // not shift. We keep the raw character so "/" still works for "shift+/".
  return raw;
}

export function parseKeyCombo(combo: string): ParsedCombo {
  const parts = combo.split('+').map((p) => p.trim().toLowerCase());
  const parsed: ParsedCombo = {
    ctrl: false,
    shift: false,
    alt: false,
    meta: false,
    key: '',
  };

  for (const part of parts) {
    if (part === 'ctrl' || part === 'control') {
      parsed.ctrl = true;
    } else if (part === 'shift') {
      parsed.shift = true;
    } else if (part === 'alt' || part === 'option') {
      parsed.alt = true;
    } else if (part === 'meta' || part === 'cmd' || part === 'command') {
      parsed.meta = true;
    } else if (part === 'mod') {
      // `mod` is a cross-platform shorthand: ⌘ on macOS, Ctrl elsewhere.
      if (isMac()) {
        parsed.meta = true;
      } else {
        parsed.ctrl = true;
      }
    } else {
      parsed.key = normalizeKey(part);
    }
  }

  return parsed;
}

export function matchesCombo(event: KeyboardEvent, parsed: ParsedCombo): boolean {
  if (event.ctrlKey !== parsed.ctrl) {
    return false;
  }
  if (event.shiftKey !== parsed.shift) {
    return false;
  }
  if (event.altKey !== parsed.alt) {
    return false;
  }
  if (event.metaKey !== parsed.meta) {
    return false;
  }
  // For single-character keys we compare case-insensitively so `mod+K`
  // matches both `K` (with shift) and `k` (without).
  if (parsed.key.length === 1) {
    return event.key.toLowerCase() === parsed.key.toLowerCase();
  }
  return event.key === parsed.key;
}
