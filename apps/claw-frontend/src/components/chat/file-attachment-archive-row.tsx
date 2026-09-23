import { Archive, ListTree } from 'lucide-react';

import { DropdownMenuCheckboxItem, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import type { FileAttachmentArchiveRowProps } from '@/types/archive.types';
import { getArchiveFileCount } from '@/utilities/archive-status.utility';

// An archive in the paperclip menu: the checkbox attaches it WHOLE (its
// manifest carries every readable file), and the item below opens its tree to
// pick individual files instead. Both are menu items, so arrow keys reach them.
export function FileAttachmentArchiveRow({
  file,
  checked,
  selectedMemberCount,
  onToggle,
  onBrowse,
  t,
}: FileAttachmentArchiveRowProps): React.ReactElement {
  const fileCount = getArchiveFileCount(file);

  return (
    <div className="flex flex-col" data-testid="attachment-archive-row">
      <DropdownMenuCheckboxItem
        checked={checked}
        onCheckedChange={(next) => onToggle(file.id, next === true)}
        onSelect={(e) => e.preventDefault()}
      >
        <div className="flex min-w-0 flex-col gap-0.5 overflow-hidden">
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            <Archive className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="truncate">{file.filename}</span>
          </span>
          <span className="touch:text-xs text-muted-foreground text-[10px]">
            {t('files.archive.attachWhole')}
            {fileCount > 0 ? ` · ${t('files.archive.fileCount', { count: fileCount })}` : ''}
          </span>
          {selectedMemberCount > 0 ? (
            <span className="touch:text-xs text-primary text-[10px]">
              {t('files.archive.membersSelected', { count: selectedMemberCount })}
            </span>
          ) : null}
        </div>
      </DropdownMenuCheckboxItem>
      {(file.childCount ?? 0) > 0 ? (
        <DropdownMenuItem
          onSelect={() => onBrowse(file)}
          className="touch:min-h-11 text-muted-foreground gap-1.5 ps-8 text-xs"
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
          {t('files.archive.chooseFiles')}
        </DropdownMenuItem>
      ) : null}
    </div>
  );
}
