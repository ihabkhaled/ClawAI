import { useCallback, useEffect, useState } from 'react';

import { COMPOSER_CONTEXT_PACKS_MAX, EMPTY_PACK_IDS } from '@/constants/composer-context.constants';
import { useComposerThread } from '@/hooks/chat/use-composer-thread';
import { useUpdateThread } from '@/hooks/chat/use-update-thread';
import { useContextPacks } from '@/hooks/context-packs/use-context-packs';
import type { UseComposerContextPacksReturn } from '@/types/composer-context.types';
import { toggledPackIds } from '@/utilities/composer-context.utility';

/**
 * The packs attached to this chat, edited from the composer.
 *
 * A pick is saved on the thread straight away (`contextPackIds`), which is the
 * field chat-service reads when it assembles the NEXT message — so the picker
 * is not a draft that might be forgotten, it is the real attachment. The
 * choice shows at once and is dropped in favour of the server's answer when the
 * thread refetches.
 */
export function useComposerContextPacks(threadId: string): UseComposerContextPacksReturn {
  const thread = useComposerThread(threadId);
  const { contextPacks, isLoading } = useContextPacks();
  const { updateThread, isPending } = useUpdateThread();
  const [pending, setPending] = useState<string[] | null>(null);
  const savedIds = thread?.contextPackIds ?? EMPTY_PACK_IDS;
  const selectedIds = pending ?? savedIds;

  useEffect(() => {
    setPending(null);
  }, [savedIds]);

  const toggle = useCallback(
    (packId: string): void => {
      const next = toggledPackIds(selectedIds, packId, COMPOSER_CONTEXT_PACKS_MAX);
      if (next === null) {
        return;
      }
      setPending(next);
      updateThread(
        { id: threadId, data: { contextPackIds: next } },
        { onError: () => setPending(null) },
      );
    },
    [selectedIds, threadId, updateThread],
  );

  return {
    packs: contextPacks,
    isLoading,
    selectedIds,
    selectedCount: selectedIds.length,
    atLimit: selectedIds.length >= COMPOSER_CONTEXT_PACKS_MAX,
    isSaving: isPending,
    toggle,
  };
}
