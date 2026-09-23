import { useMemo } from 'react';

import { ARCHIVE_TREE_AUTO_EXPAND_MAX_ENTRIES } from '@/constants/archive.constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { UseArchiveTreeReturn } from '@/types/archive.types';
import { buildArchiveTree } from '@/utilities/archive-tree.utility';

import { useArchiveEntries } from './use-archive-entries';
import { useArchiveFolderExpansion } from './use-archive-folder-expansion';

/** Controller for ArchiveEntryTree: the entries, their folder tree, and which folders are open. */
export function useArchiveTree(archiveFileId: string): UseArchiveTreeReturn {
  const { t } = useTranslation();
  const { listing, isLoading, isError } = useArchiveEntries(archiveFileId, true);
  const entries = listing?.entries;
  const tree = useMemo(() => buildArchiveTree(entries ?? []), [entries]);
  const ancestorIds = useMemo(() => [archiveFileId], [archiveFileId]);
  const isSmall = (entries?.length ?? 0) <= ARCHIVE_TREE_AUTO_EXPAND_MAX_ENTRIES;
  const { isFolderExpanded, toggleFolder } = useArchiveFolderExpansion(isSmall);

  return { t, listing, tree, ancestorIds, isLoading, isError, isFolderExpanded, toggleFolder };
}
