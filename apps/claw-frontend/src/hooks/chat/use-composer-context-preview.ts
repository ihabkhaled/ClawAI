import { useCallback, useMemo, useState } from 'react';

import { useComposerThread } from '@/hooks/chat/use-composer-thread';
import { usePreviewContext } from '@/hooks/chat/use-preview-context';
import { useContextPacks } from '@/hooks/context-packs/use-context-packs';
import type { UseComposerContextPreviewReturn } from '@/types/composer-context.types';
import { groupPackItems } from '@/utilities/composer-context.utility';

/**
 * What the next message would actually carry from memory and context packs, for
 * the two "view" dialogs. It asks the same dry-run the preview button uses (the
 * server's own assembly), so the dialog shows what will be sent, not what the
 * client guesses: a pack that is attached but switched off for this chat, or
 * one that is empty, simply does not appear.
 */
export function useComposerContextPreview(
  threadId: string,
  draft: string,
): UseComposerContextPreviewReturn {
  const [open, setOpen] = useState(false);
  const thread = useComposerThread(threadId);
  const { contextPacks } = useContextPacks();
  const preview = usePreviewContext(threadId);
  const { mutate } = preview;
  const bundle = preview.data ?? null;

  const onOpenChange = useCallback(
    (next: boolean): void => {
      setOpen(next);
      if (next) {
        mutate({ draft });
      }
    },
    [draft, mutate],
  );
  const packGroups = useMemo(
    () => groupPackItems(bundle?.packItems ?? [], contextPacks),
    [bundle, contextPacks],
  );

  return {
    open,
    onOpenChange,
    isLoading: preview.isPending,
    isError: preview.isError,
    bundle,
    packGroups,
    thread,
    // Both default ON in the column, so an absent value means on.
    useMemory: thread?.useMemory ?? true,
    useContext: thread?.useContext ?? true,
  };
}
