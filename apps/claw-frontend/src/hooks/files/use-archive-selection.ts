import { useCallback, useState } from 'react';

import type { UseArchiveSelectionParams, UseArchiveSelectionReturn } from '@/types/archive.types';
import {
  applyArchiveSelection,
  countSelectedArchiveMembers,
} from '@/utilities/archive-selection.utility';

/**
 * Attachment selection that knows about archives: a whole archive and a file
 * picked from inside it are never both selected (see applyArchiveSelection).
 * The selected ids stay owned by the caller; this hook only remembers which
 * archive each picked member came from.
 */
export function useArchiveSelection({
  selectedFileIds,
  onChange,
}: UseArchiveSelectionParams): UseArchiveSelectionReturn {
  const [ancestryById, setAncestryById] = useState<ReadonlyMap<string, readonly string[]>>(
    () => new Map(),
  );

  const onToggle = useCallback(
    (fileId: string, checked: boolean, ancestorIds: readonly string[] = []): void => {
      const result = applyArchiveSelection({
        selectedIds: selectedFileIds,
        targetId: fileId,
        checked,
        ancestorIds,
        ancestryById,
      });
      setAncestryById(result.ancestryById);
      onChange(result.selectedIds);
    },
    [selectedFileIds, onChange, ancestryById],
  );

  const isSelected = useCallback(
    (fileId: string): boolean => selectedFileIds.includes(fileId),
    [selectedFileIds],
  );

  const selectedMemberCount = useCallback(
    (archiveId: string): number =>
      countSelectedArchiveMembers(selectedFileIds, archiveId, ancestryById),
    [selectedFileIds, ancestryById],
  );

  return { onToggle, isSelected, selectedMemberCount };
}
