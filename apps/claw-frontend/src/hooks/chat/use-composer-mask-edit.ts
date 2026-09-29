import { useCallback, useRef, useState } from 'react';

import type {
  ComposerMaskState,
  UseComposerMaskEditParams,
  UseComposerMaskEditReturn,
} from '@/types/image-mask-editor.types';

/**
 * The composer's inpainting state: which attached image is open in the editor,
 * and the mask drawn for it.
 *
 * The chat pipeline edits `imageFiles[0]`, so applying a mask moves its source
 * image to the FRONT of the attached list. A mask belongs to the one send it
 * was drawn for: `consumeMaskFor` hands it out once, and only if its source
 * image is still attached.
 */
export function useComposerMaskEdit({
  selectedFileIds,
  onSelectedFileIdsChange,
}: UseComposerMaskEditParams): UseComposerMaskEditReturn {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [mask, setMask] = useState<ComposerMaskState | null>(null);
  const maskRef = useRef<ComposerMaskState | null>(null);

  const openEditor = useCallback((fileId: string): void => setEditingFileId(fileId), []);
  const closeEditor = useCallback((): void => setEditingFileId(null), []);

  const applyMask = useCallback(
    (sourceFileId: string, maskFileId: string): void => {
      const next = { sourceFileId, maskFileId };
      maskRef.current = next;
      setMask(next);
      onSelectedFileIdsChange([
        sourceFileId,
        ...selectedFileIds.filter((fileId) => fileId !== sourceFileId),
      ]);
    },
    [onSelectedFileIdsChange, selectedFileIds],
  );

  const clearMask = useCallback((): void => {
    maskRef.current = null;
    setMask(null);
  }, []);

  const consumeMaskFor = useCallback(
    (fileIds: readonly string[] | undefined): string | undefined => {
      const current = maskRef.current;
      maskRef.current = null;
      setMask(null);
      if (current === null || fileIds === undefined || fileIds[0] !== current.sourceFileId) {
        return undefined;
      }
      return current.maskFileId;
    },
    [],
  );

  return { editingFileId, openEditor, closeEditor, mask, applyMask, clearMask, consumeMaskFor };
}
