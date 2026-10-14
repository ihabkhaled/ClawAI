'use client';

import { ComposerPlusMenuHost } from '@/components/chat/composer-plus-menu-host';
import { FileLibraryDialog } from '@/components/chat/file-library-dialog';
import { PromptLibraryDialog } from '@/components/chat/prompt-library/prompt-library-dialog';
import { useComposerPlusMenu } from '@/hooks/chat/use-composer-plus-menu';
import type { ComposerPlusMenuProps } from '@/types/composer-plus-menu.types';

/**
 * ONE round "+" button that replaces the attach, context, preview, research-provider and
 * prompt-library controls that used to sit loose in the composer row. Keeps
 * data-tour="composer-attach" so product tours still anchor to it. The prompt library and
 * the file library's Browse all dialog are siblings of the popover, so they outlive it closing.
 */
export function ComposerPlusMenu(props: ComposerPlusMenuProps): React.ReactElement {
  const menu = useComposerPlusMenu(props.onInsertPrompt, props.disabled);

  return (
    <>
      <ComposerPlusMenuHost {...props} menu={menu} />
      <PromptLibraryDialog {...menu.prompts} />
      <FileLibraryDialog
        open={menu.libraryOpen}
        onOpenChange={menu.onLibraryOpenChange}
        onDone={menu.closeMenu}
        selectedFileIds={props.selectedFileIds}
        onChange={props.onSelectedFileIdsChange}
        ingestFiles={props.ingestFiles}
        isUploading={props.isUploadingAttachment}
        disabled={props.disabled}
      />
    </>
  );
}
