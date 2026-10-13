import { LayoutGrid, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import type { FileLibraryViewToggleProps } from '@/types/file-library-ui.types';

/** Grid / list switch. Two pressed-state icon buttons in one labelled group. */
export function FileLibraryViewToggle({
  viewMode,
  onChange,
  t,
}: FileLibraryViewToggleProps): React.ReactElement {
  const isGrid = viewMode === FileLibraryViewMode.Grid;

  return (
    <div
      role="group"
      aria-label={t('chat.fileLibrary.dialog.layout')}
      className="flex shrink-0 items-center rounded-md border p-0.5"
    >
      <Button
        type="button"
        variant={isGrid ? 'secondary' : 'ghost'}
        size="icon-sm"
        aria-pressed={isGrid}
        aria-label={t('chat.fileLibrary.dialog.grid')}
        title={t('chat.fileLibrary.dialog.grid')}
        data-library-nav=""
        onClick={() => onChange(FileLibraryViewMode.Grid)}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        variant={isGrid ? 'ghost' : 'secondary'}
        size="icon-sm"
        aria-pressed={!isGrid}
        aria-label={t('chat.fileLibrary.dialog.list')}
        title={t('chat.fileLibrary.dialog.list')}
        data-library-nav=""
        onClick={() => onChange(FileLibraryViewMode.List)}
      >
        <List className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
