import { ListTree } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FileLibraryThumbSize } from '@/enums/file-library-thumb-size.enum';
import { useFileLibraryRow } from '@/hooks/chat/use-file-library-row';
import { cn } from '@/lib/utils';
import type { FileLibraryRowProps } from '@/types/file-library-ui.types';

import { FileLibraryCheck } from './file-library-check';
import { FileLibraryThumb } from './file-library-thumb';

/**
 * One file in a list: thumbnail, name (truncated, full name on hover), size and
 * date, and a selection mark. The whole row is the toggle. An archive carries a
 * second button that opens its contents, kept beside the row rather than inside
 * it (a button never contains a button).
 */
export function FileLibraryRow({
  file,
  checked,
  disabled,
  selectedMemberCount,
  onToggle,
  onBrowseArchive,
}: FileLibraryRowProps): React.ReactElement {
  const { t, metaLine, KindIcon, statusLabel, StatusIcon, statusSpin, showBrowseArchive } =
    useFileLibraryRow(file);

  return (
    <li className="flex items-center gap-1" data-testid="file-library-row">
      <Button
        type="button"
        variant="unstyled"
        size="unstyled"
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        disabled={disabled}
        data-library-nav=""
        title={file.filename}
        onClick={() => onToggle(file)}
        className={cn(
          'hover:bg-accent focus-visible:ring-ring touch:min-h-11 flex min-w-0 flex-1 items-center justify-start gap-3 rounded-lg px-2 py-1.5 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset disabled:opacity-50',
          checked ? 'bg-accent/60' : null,
        )}
      >
        <FileLibraryThumb file={file} size={FileLibraryThumbSize.Small} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            {KindIcon === null ? null : (
              <KindIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate text-sm font-medium">{file.filename}</span>
          </span>
          <span className="text-muted-foreground flex min-w-0 items-center gap-1 text-xs">
            <span className="truncate">{metaLine}</span>
            {StatusIcon === null ? null : (
              <span className="flex shrink-0 items-center gap-1">
                <StatusIcon
                  className={cn('h-3 w-3', statusSpin ? 'animate-spin' : null)}
                  aria-hidden="true"
                />
                {statusLabel}
              </span>
            )}
            {selectedMemberCount > 0 ? (
              <span className="text-primary shrink-0">
                {t('files.archive.membersSelected', { count: selectedMemberCount })}
              </span>
            ) : null}
          </span>
        </span>
        <FileLibraryCheck checked={checked} />
      </Button>
      {showBrowseArchive ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          data-library-nav=""
          className="shrink-0"
          aria-label={t('chat.fileLibrary.archiveChoose', { name: file.filename })}
          title={t('files.archive.chooseFiles')}
          onClick={() => onBrowseArchive(file)}
        >
          <ListTree className="h-4 w-4" aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}
