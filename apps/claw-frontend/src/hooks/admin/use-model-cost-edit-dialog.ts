import { useCallback, useState } from 'react';

import type { ModelCostCatalogRow, UseModelCostEditDialogResult } from '@/types/model-cost.types';

/** Which row the edit dialog is pointed at, and whether it is showing. */
export function useModelCostEditDialog(): UseModelCostEditDialogResult {
  const [editing, setEditing] = useState<ModelCostCatalogRow | null>(null);

  const open = useCallback((row: ModelCostCatalogRow): void => {
    setEditing(row);
  }, []);

  const close = useCallback((): void => {
    setEditing(null);
  }, []);

  const setOpen = useCallback((next: boolean): void => {
    if (!next) {
      setEditing(null);
    }
  }, []);

  return { isOpen: editing !== null, editing, open, close, setOpen };
}
