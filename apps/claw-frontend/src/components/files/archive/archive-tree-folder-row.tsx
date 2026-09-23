import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { ArchiveTreeFolderRowProps } from '@/types/archive.types';
import { archiveTreeIndentStyle } from '@/utilities/archive-tree.utility';

export function ArchiveTreeFolderRow({
  node,
  depth,
  expanded,
  onToggle,
  t,
}: ArchiveTreeFolderRowProps): React.ReactElement {
  const FolderIcon = expanded ? FolderOpen : Folder;

  return (
    <Button
      type="button"
      variant="unstyled"
      size="unstyled"
      aria-expanded={expanded}
      onClick={() => onToggle(node.key)}
      style={archiveTreeIndentStyle(depth)}
      className="hover:bg-accent/40 touch:min-h-11 flex min-h-8 w-full min-w-0 items-center gap-1.5 rounded-md py-1 pe-2 text-start text-sm"
    >
      {expanded ? (
        <ChevronDown className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      ) : (
        <ChevronRight
          className="text-muted-foreground h-3.5 w-3.5 shrink-0 rtl:rotate-180"
          aria-hidden="true"
        />
      )}
      <FolderIcon className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate font-medium" title={node.key}>
        {node.name}
      </span>
      <span className="text-muted-foreground touch:text-xs shrink-0 text-[11px]">
        {t('files.archive.fileCount', { count: node.fileCount })}
      </span>
    </Button>
  );
}
