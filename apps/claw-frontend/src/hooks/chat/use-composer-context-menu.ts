import { useCallback, useState } from 'react';

import type { ComposerContextDialog } from '@/enums/composer-context-dialog.enum';
import { useComposerContextPacks } from '@/hooks/chat/use-composer-context-packs';
import { useComposerContextPreview } from '@/hooks/chat/use-composer-context-preview';
import type { UseComposerContextMenuReturn } from '@/types/composer-context.types';

/**
 * State for the one "Context" button: the menu itself, which of the two
 * read-only dialogs is open, and the pack picker and server dry-run both share.
 * One preview request serves both dialogs, so opening either asks for a fresh
 * one for the message about to be sent.
 */
export function useComposerContextMenu(
  threadId: string,
  draft: string,
): UseComposerContextMenuReturn {
  const picker = useComposerContextPacks(threadId);
  const preview = useComposerContextPreview(threadId, draft);
  const { onOpenChange: onPreviewOpenChange } = preview;
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<ComposerContextDialog | null>(null);

  const openDialog = useCallback(
    (target: ComposerContextDialog): void => {
      setMenuOpen(false);
      setDialog(target);
      onPreviewOpenChange(true);
    },
    [onPreviewOpenChange],
  );
  const closeDialog = useCallback((): void => {
    setDialog(null);
    onPreviewOpenChange(false);
  }, [onPreviewOpenChange]);

  return {
    picker,
    preview,
    menuOpen,
    onMenuOpenChange: setMenuOpen,
    dialog,
    openDialog,
    closeDialog,
  };
}
