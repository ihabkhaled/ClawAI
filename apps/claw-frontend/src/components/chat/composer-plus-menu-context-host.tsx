'use client';

import { ComposerContextPacksView } from '@/components/chat/composer-context-packs-view';
import { ComposerMemoryView } from '@/components/chat/composer-memory-view';
import { ComposerPlusMenuView } from '@/components/chat/composer-plus-menu-view';
import { PreviewContextDialog } from '@/components/chat/preview-context-dialog';
import { ComposerContextDialog } from '@/enums/composer-context-dialog.enum';
import { useComposerContextMenu } from '@/hooks/chat/use-composer-context-menu';
import type { ComposerPlusMenuContextHostProps } from '@/types/composer-plus-menu.types';

/**
 * The "+" menu on a thread. Split out so the context hooks (packs, preview) run only when
 * there is a thread to hold them; the new-chat surface renders the bare menu instead.
 * Owns the three context dialogs, rendered beside the menu rather than inside it.
 */
export function ComposerPlusMenuContextHost(
  props: ComposerPlusMenuContextHostProps,
): React.ReactElement {
  const { threadId, draft, menu } = props;
  const context = useComposerContextMenu(threadId, draft);

  return (
    <>
      <ComposerPlusMenuView {...props} context={context} />
      <ComposerContextPacksView
        preview={context.preview}
        open={context.dialog === ComposerContextDialog.VIEW}
        onClose={context.closeDialog}
      />
      <ComposerMemoryView
        preview={context.preview}
        open={context.dialog === ComposerContextDialog.MEMORY}
        onClose={context.closeDialog}
      />
      <PreviewContextDialog
        threadId={threadId}
        draft={draft}
        open={menu.previewOpen}
        onOpenChange={menu.onPreviewOpenChange}
      />
    </>
  );
}
