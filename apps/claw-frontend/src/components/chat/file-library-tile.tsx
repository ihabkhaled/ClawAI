import { ListTree } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FileLibraryThumbSize } from '@/enums/file-library-thumb-size.enum';
import { useFileLibraryRow } from '@/hooks/chat/use-file-library-row';
import { cn } from '@/lib/utils';
import type { FileLibraryTileProps } from '@/types/file-library-ui.types';

import { FileLibraryCheck } from './file-library-check';
import { FileLibraryThumb } from './file-library-thumb';

/** The grid cell of a file: a square thumbnail, its name, and a corner selection mark. */
export function FileLibraryTile({
  file,
  checked,
  disabled,
  selectedMemberCount,
  onToggle,
  onBrowseArchive,
}: FileLibraryTileProps): React.ReactElement {
  const { t, metaLine, KindIcon, showBrowseArchive } = useFileLibraryRow(file);

  return (
    <li className="relative min-w-0" data-testid="file-library-tile">
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
          'hover:bg-accent focus-visible:ring-ring flex w-full min-w-0 flex-col items-stretch justify-start gap-1.5 rounded-xl border p-1.5 text-start transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset disabled:opacity-50',
          checked ? 'border-primary bg-accent/60' : 'border-transparent',
        )}
      >
        <FileLibraryThumb file={file} size={FileLibraryThumbSize.Large} />
        <span className="flex min-w-0 flex-col px-0.5">
          <span className="flex min-w-0 items-center gap-1">
            {KindIcon === null ? null : (
              <KindIcon className="text-muted-foreground h-3 w-3 shrink-0" aria-hidden="true" />
            )}
            <span className="truncate text-xs font-medium">{file.filename}</span>
          </span>
          <span className="text-muted-foreground truncate text-[11px]">
            {selectedMemberCount > 0
              ? t('files.archive.membersSelected', { count: selectedMemberCount })
              : metaLine}
          </span>
        </span>
      </Button>
      <FileLibraryCheck checked={checked} className="pointer-events-none absolute end-3 top-3" />
      {showBrowseArchive ? (
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          data-library-nav=""
          className="absolute start-3 top-3"
          aria-label={t('chat.fileLibrary.archiveChoose', { name: file.filename })}
          title={t('files.archive.chooseFiles')}
          onClick={() => onBrowseArchive(file)}
        >
          <ListTree className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      ) : null}
    </li>
  );
}
