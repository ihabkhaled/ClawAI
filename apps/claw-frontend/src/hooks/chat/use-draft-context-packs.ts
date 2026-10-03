import { useCallback } from 'react';

import { COMPOSER_CONTEXT_PACKS_MAX } from '@/constants/composer-context.constants';
import { useContextPacks } from '@/hooks/context-packs/use-context-packs';
import type {
  UseComposerContextPacksReturn,
  UseDraftContextPacksParams,
} from '@/types/composer-context.types';
import { toggledPackIds } from '@/utilities/composer-context.utility';

/**
 * The same picker contract as `useComposerContextPacks`, for a surface that has no
 * thread yet (every lab page: the run creates the thread). The choice is held by the
 * caller and travels in the request as `contextPackIds`, which the backend stores on the
 * thread it creates, so a pack reaches the model exactly as it does in normal chat.
 */
export function useDraftContextPacks({
  selectedIds,
  onChange,
}: UseDraftContextPacksParams): UseComposerContextPacksReturn {
  const { contextPacks, isLoading } = useContextPacks();

  const toggle = useCallback(
    (packId: string): void => {
      const next = toggledPackIds(selectedIds, packId, COMPOSER_CONTEXT_PACKS_MAX);
      if (next !== null) {
        onChange(next);
      }
    },
    [selectedIds, onChange],
  );

  return {
    packs: contextPacks,
    isLoading,
    selectedIds,
    selectedCount: selectedIds.length,
    atLimit: selectedIds.length >= COMPOSER_CONTEXT_PACKS_MAX,
    isSaving: false,
    toggle,
  };
}
