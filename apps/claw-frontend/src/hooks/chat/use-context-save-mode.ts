'use client';

import { useCallback, useSyncExternalStore } from 'react';

import { DEFAULT_CONTEXT_SAVE_MODE } from '@/constants/context-save.constants';
import type { ContextSaveMode, UseContextSaveModeReturn } from '@/types';
import {
  readContextSaveMode,
  subscribeContextSaveMode,
  writeContextSaveMode,
} from '@/utilities/context-save-mode.utility';

/**
 * The viewer's "always save automatically" choice (ADR-168). Every component
 * that shows it (the dialog's checkbox, the card's switch) reads the same value
 * through here, so flipping one is seen by the other at once.
 */
export function useContextSaveMode(): UseContextSaveModeReturn {
  const mode = useSyncExternalStore(
    subscribeContextSaveMode,
    readContextSaveMode,
    () => DEFAULT_CONTEXT_SAVE_MODE,
  );
  const setMode = useCallback((next: ContextSaveMode): void => {
    writeContextSaveMode(next);
  }, []);
  return { mode, setMode };
}
