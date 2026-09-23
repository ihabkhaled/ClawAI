import { FileText } from 'lucide-react';

import { Checkbox } from '@/components/ui/checkbox';
import type { ArchiveTreeFileRowProps } from '@/types/archive.types';
import { formatFileSize } from '@/utilities';
import { isArchiveEntrySelectable } from '@/utilities/archive-status.utility';
import { archiveTreeIndentStyle } from '@/utilities/archive-tree.utility';

import { ArchiveEntryStatusBadge } from './archive-entry-status-badge';

// One entry. The row wraps instead of overflowing: on a 320px phone the status
// badge drops under the name rather than pushing the row wider than the screen.
// A checkbox appears only when a selection is given AND the entry became a
// file — a skipped entry has nothing to attach.
export function ArchiveTreeFileRow({
  node,
  depth,
  ancestorIds,
  selection,
  t,
}: ArchiveTreeFileRowProps): React.ReactElement {
  const { entry } = node;
  const childFileId = entry.childFileId;
  const canSelect =
    selection !== undefined && childFileId !== null && isArchiveEntrySelectable(entry);
  const inputId = `archive-entry-${childFileId ?? node.key}`;

  return (
    <div
      style={archiveTreeIndentStyle(depth)}
      className="touch:min-h-11 flex min-h-8 min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 py-1 pe-2"
      data-testid="archive-tree-file"
    >
      {canSelect ? (
        <Checkbox
          id={inputId}
          checked={selection.isSelected(childFileId)}
          onCheckedChange={(next) => selection.onToggle(childFileId, next === true, ancestorIds)}
          aria-label={entry.archivePath}
        />
      ) : (
        <FileText className="text-muted-foreground ms-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      <label
        htmlFor={canSelect ? inputId : undefined}
        className="min-w-0 flex-1 basis-28 truncate text-sm"
        title={entry.archivePath}
      >
        {node.name}
      </label>
      <span className="text-muted-foreground touch:text-xs shrink-0 text-[11px] tabular-nums">
        {formatFileSize(entry.sizeBytes)}
      </span>
      <ArchiveEntryStatusBadge status={entry.status} t={t} />
    </div>
  );
}
