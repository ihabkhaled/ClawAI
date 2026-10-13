import { useCallback } from 'react';
import type { KeyboardEvent, RefObject } from 'react';

import {
  COMPOSER_PLUS_NAV_SELECTOR,
  COMPOSER_PLUS_NAV_TARGET_SELECTOR,
} from '@/constants/composer-plus-menu.constants';
import type { UseComposerPlusMenuKeyboardReturn } from '@/types/composer-plus-menu.types';
import { nextPlusMenuIndex } from '@/utilities/composer-plus-menu.utility';

/**
 * Keyboard for the "+" menu: opening lands on the menu itself (not the search box, which
 * would raise the on-screen keyboard on a phone), and the arrow keys walk ONE ordered list of
 * menu rows and file-library elements, so they cross Attach, Context and Tools.
 */
export function useComposerPlusMenuKeyboard(
  contentRef: RefObject<HTMLDivElement | null>,
): UseComposerPlusMenuKeyboardReturn {
  const onOpenAutoFocus = useCallback(
    (event: Event): void => {
      event.preventDefault();
      contentRef.current?.focus();
    },
    [contentRef],
  );

  const onKeyDown = useCallback((event: KeyboardEvent<HTMLElement>): void => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }
    const onMenuItself = target === event.currentTarget;
    if (!onMenuItself && !target.matches(COMPOSER_PLUS_NAV_TARGET_SELECTOR)) {
      return;
    }
    const isTyping = target instanceof HTMLInputElement;
    if (isTyping && (event.key === 'Home' || event.key === 'End')) {
      return;
    }
    const rows = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(COMPOSER_PLUS_NAV_SELECTOR),
    );
    const next = nextPlusMenuIndex(event.key, rows.indexOf(target), rows.length);
    if (next === null) {
      return;
    }
    event.preventDefault();
    rows[next]?.focus();
  }, []);

  return { onKeyDown, onOpenAutoFocus };
}
