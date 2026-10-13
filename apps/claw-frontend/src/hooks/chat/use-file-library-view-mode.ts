import { useCallback, useState } from 'react';

import type { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import type { UseFileLibraryViewModeReturn } from '@/types/file-library-ui.types';
import { readStoredLibraryViewMode, storeLibraryViewMode } from '@/utilities/file-library.utility';

/** Grid or list, remembered in this browser only (a per-viewer convenience). */
export function useFileLibraryViewMode(): UseFileLibraryViewModeReturn {
  const [viewMode, setViewModeState] = useState<FileLibraryViewMode>(readStoredLibraryViewMode);

  const setViewMode = useCallback((mode: FileLibraryViewMode): void => {
    setViewModeState(mode);
    storeLibraryViewMode(mode);
  }, []);

  return { viewMode, setViewMode };
}
