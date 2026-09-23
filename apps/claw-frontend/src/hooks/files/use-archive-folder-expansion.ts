import { useCallback, useState } from 'react';

import type { UseArchiveFolderExpansionReturn } from '@/types/archive.types';

/**
 * Which folders of an archive tree are open. `defaultExpanded` answers for a
 * folder the person has not toggled yet, so a small archive can start fully
 * open without seeding state from data that arrives later.
 */
export function useArchiveFolderExpansion(
  defaultExpanded: boolean,
): UseArchiveFolderExpansionReturn {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(() => new Map());

  const isFolderExpanded = useCallback(
    (key: string): boolean => overrides.get(key) ?? defaultExpanded,
    [overrides, defaultExpanded],
  );

  const toggleFolder = useCallback(
    (key: string): void => {
      setOverrides((previous) => {
        const next = new Map(previous);
        next.set(key, !(previous.get(key) ?? defaultExpanded));
        return next;
      });
    },
    [defaultExpanded],
  );

  return { isFolderExpanded, toggleFolder };
}
