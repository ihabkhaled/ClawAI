import { useCallback, useEffect, useRef, useState } from 'react';

import {
  COMPOSER_PLUS_ITEM_SELECTOR,
  COMPOSER_PLUS_RETURN_ATTRIBUTE,
} from '@/constants/composer-plus-menu.constants';
import { ComposerPlusMenuView } from '@/enums/composer-plus-menu-view.enum';
import { useComposerPlusMenuKeyboard } from '@/hooks/chat/use-composer-plus-menu-keyboard';
import { usePromptLibraryController } from '@/hooks/prompt-library/use-prompt-library-controller';
import type { UseComposerPlusMenuReturn } from '@/types/composer-plus-menu.types';

/**
 * State for the composer's one "+" menu: open/closed, which panel is showing, arrow-key
 * focus movement, and the three dialogs the menu opens (prompt library, context preview,
 * Browse all). Those dialogs are owned here and rendered OUTSIDE the menu content, because
 * the content unmounts the moment the menu closes and would take an open dialog with it.
 */
export function useComposerPlusMenu(
  onInsertPrompt: (text: string) => void,
  disabled: boolean,
): UseComposerPlusMenuReturn {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ComposerPlusMenuView>(ComposerPlusMenuView.MAIN);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const previousView = useRef<ComposerPlusMenuView>(ComposerPlusMenuView.MAIN);
  const prompts = usePromptLibraryController({ onInsert: onInsertPrompt, disabled });
  const keyboard = useComposerPlusMenuKeyboard(contentRef);
  const { onOpenChange: onPromptsOpenChange } = prompts;

  const onOpenChange = useCallback((next: boolean): void => {
    setOpen(next);
    if (!next) {
      setView(ComposerPlusMenuView.MAIN);
    }
  }, []);
  const closeMenu = useCallback((): void => onOpenChange(false), [onOpenChange]);
  const showView = useCallback((next: ComposerPlusMenuView): void => setView(next), []);
  const backToMain = useCallback((): void => setView(ComposerPlusMenuView.MAIN), []);

  // A sub-panel swaps the focused row out of the DOM, which would drop focus to <body> and
  // end keyboard navigation. Land on the first row of the new panel, or on the row that
  // opened the panel we just left.
  useEffect(() => {
    const left = previousView.current;
    previousView.current = view;
    const content = contentRef.current;
    if (!open || content === null || left === view) {
      return;
    }
    const target =
      view === ComposerPlusMenuView.MAIN
        ? content.querySelector<HTMLElement>(`[${COMPOSER_PLUS_RETURN_ATTRIBUTE}="${left}"]`)
        : content.querySelector<HTMLElement>(COMPOSER_PLUS_ITEM_SELECTOR);
    target?.focus();
  }, [view, open]);

  const openPrompts = useCallback((): void => {
    closeMenu();
    onPromptsOpenChange(true);
  }, [closeMenu, onPromptsOpenChange]);
  const openPreview = useCallback((): void => {
    closeMenu();
    setPreviewOpen(true);
  }, [closeMenu]);
  const openLibrary = useCallback((): void => {
    closeMenu();
    setLibraryOpen(true);
  }, [closeMenu]);

  return {
    open,
    onOpenChange,
    closeMenu,
    view,
    showView,
    backToMain,
    contentRef,
    ...keyboard,
    prompts,
    openPrompts,
    previewOpen,
    onPreviewOpenChange: setPreviewOpen,
    openPreview,
    libraryOpen,
    onLibraryOpenChange: setLibraryOpen,
    openLibrary,
  };
}
