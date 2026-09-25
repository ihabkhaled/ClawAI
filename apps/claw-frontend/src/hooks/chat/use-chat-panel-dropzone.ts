import { useCallback } from 'react';

import { useComposerDropTargetStore } from '@/stores/composer-drop-target.store';
import type { UseChatPanelDropzoneReturn } from '@/types/composer-attachment.types';

/**
 * The whole chat panel as a drop target. Files go to whichever composer is
 * registered in the drop-target store — the same upload pipeline the paperclip
 * uses — and the zone is inert while no composer is mounted.
 */
export function useChatPanelDropzone(): UseChatPanelDropzoneReturn {
  const ingest = useComposerDropTargetStore((state) => state.ingest);

  const onFiles = useCallback(
    (files: FileList | File[]): void => {
      ingest?.(files);
    },
    [ingest],
  );

  return { onFiles, disabled: ingest === null };
}
