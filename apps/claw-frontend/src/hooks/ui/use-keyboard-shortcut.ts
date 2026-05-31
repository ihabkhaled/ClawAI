import * as React from 'react';

import type { UseKeyboardShortcutOptions } from '@/types/hook.types';
import { matchesCombo, parseKeyCombo } from '@/utilities/keyboard-shortcut.utility';

// Listens for a keyboard combo (or several) on `window` and fires the handler
// when the user presses them. Combo format: "mod+k", "shift+/", "ctrl+enter",
// "alt+ArrowLeft". `mod` resolves to ⌘ on macOS and Ctrl elsewhere.
//
// `enabled` defaults to true. `preventDefault` defaults to true — most combos
// (mod+k for search, etc.) need to swallow the browser's default behaviour.
export function useKeyboardShortcut(
  combo: string | string[],
  handler: (event: KeyboardEvent) => void,
  options: UseKeyboardShortcutOptions = {},
): void {
  const { enabled = true, preventDefault = true } = options;

  // Stash the latest handler in a ref so consumers can pass a fresh closure
  // every render without re-registering the listener.
  const handlerRef = React.useRef(handler);
  React.useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  React.useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const combos = (Array.isArray(combo) ? combo : [combo]).map(parseKeyCombo);

    const onKeyDown = (event: KeyboardEvent): void => {
      const matched = combos.some((parsed) => matchesCombo(event, parsed));
      if (!matched) {
        return;
      }
      if (preventDefault) {
        event.preventDefault();
      }
      handlerRef.current(event);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [combo, enabled, preventDefault]);
}
