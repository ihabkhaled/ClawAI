import { useCallback, useRef, useState } from 'react';

import { MEDIA_QUERY_COARSE_POINTER } from '@/constants/media-query.constants';
import { useMediaQuery } from '@/hooks/ui/use-media-query';
import { useTranslation } from '@/lib/i18n/use-translation';
import type {
  UseFileAttachmentPickerParams,
  UseFileAttachmentPickerReturn,
} from '@/types/archive.types';

/**
 * Controller for the paperclip trigger that Compare, in-thread Compare and the
 * labs still render. The menu content is the shared FileLibraryMenu; this hook
 * only owns when the popover is open and the Browse-all dialog, which is hosted
 * OUTSIDE the popover so it stays mounted after the popover closes behind it.
 *
 * Upload is not owned here: `ingestFiles` is the composer's chunked pipeline.
 */
export function useFileAttachmentPicker({
  selectedFileIds,
}: UseFileAttachmentPickerParams): UseFileAttachmentPickerReturn {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isCoarsePointer = useMediaQuery(MEDIA_QUERY_COARSE_POINTER);

  const closeMenu = useCallback((): void => setMenuOpen(false), []);
  // One handler, one batched update: the popover closes and the dialog opens
  // together, so there is never a moment with both (or a body left inert).
  const openLibrary = useCallback((): void => {
    setMenuOpen(false);
    setLibraryOpen(true);
  }, []);
  // On a phone, landing in the search box would raise the keyboard over the list.
  const handleOpenAutoFocus = useCallback(
    (event: Event): void => {
      if (isCoarsePointer) {
        event.preventDefault();
        contentRef.current?.focus();
      }
    },
    [isCoarsePointer],
  );

  return {
    t,
    selectedCount: selectedFileIds.length,
    menuOpen,
    setMenuOpen,
    closeMenu,
    libraryOpen,
    setLibraryOpen,
    openLibrary,
    contentRef,
    handleOpenAutoFocus,
  };
}
