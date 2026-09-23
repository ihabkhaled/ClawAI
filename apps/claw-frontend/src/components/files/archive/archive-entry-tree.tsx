import { useArchiveTree } from '@/hooks/files/use-archive-tree';
import { cn } from '@/lib/utils';
import type { ArchiveEntryTreeProps } from '@/types/archive.types';

import { ArchiveTreeNodeList } from './archive-tree-node-list';

/**
 * The contents of one archive as a folder tree, with each entry's outcome.
 *
 * Read-only unless given a `selection`; with one, every entry that became a
 * file gets a checkbox. Used by the files page, the composer's archive dialog
 * and message attachments — one tree, three places.
 */
export function ArchiveEntryTree({
  archiveFileId,
  selection,
  className,
}: ArchiveEntryTreeProps): React.ReactElement {
  const ctrl = useArchiveTree(archiveFileId);
  const { t, listing } = ctrl;

  if (ctrl.isLoading) {
    return (
      <p className="text-muted-foreground py-2 text-xs" role="status">
        {t('files.archive.loading')}
      </p>
    );
  }
  if (ctrl.isError || listing === undefined) {
    return (
      <p className="text-destructive py-2 text-xs" role="alert">
        {t('files.archive.loadFailed')}
      </p>
    );
  }
  if (listing.entries.length === 0 && listing.unlistedEntryCount === 0) {
    return <p className="text-muted-foreground py-2 text-xs">{t('files.archive.empty')}</p>;
  }

  return (
    <div
      className={cn('min-w-0', className)}
      aria-label={t('files.archive.contentsOf', { filename: listing.filename })}
      role="region"
      data-testid="archive-entry-tree"
    >
      <ArchiveTreeNodeList
        nodes={ctrl.tree}
        depth={0}
        ancestorIds={ctrl.ancestorIds}
        selection={selection}
        isFolderExpanded={ctrl.isFolderExpanded}
        onToggleFolder={ctrl.toggleFolder}
        t={t}
      />
      {listing.unlistedEntryCount > 0 ? (
        <p className="text-muted-foreground mt-1 ps-1 text-xs">
          {t('files.archive.unlisted', { count: listing.unlistedEntryCount })}
        </p>
      ) : null}
    </div>
  );
}
