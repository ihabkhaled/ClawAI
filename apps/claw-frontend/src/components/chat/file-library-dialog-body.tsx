import { Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { FileLibraryViewMode } from '@/enums/file-library-view-mode.enum';
import { useFileLibraryDialog } from '@/hooks/chat/use-file-library-dialog';
import { useFileLibraryNav } from '@/hooks/chat/use-file-library-nav';
import { cn } from '@/lib/utils';
import type { FileLibraryDialogBodyProps } from '@/types/file-library-ui.types';

import { ArchiveMemberDialog } from './archive-member-dialog';
import { FileLibraryFilterChips } from './file-library-filter-chips';
import { FileLibraryListState } from './file-library-list-states';
import { FileLibraryRow } from './file-library-row';
import { FileLibrarySearch } from './file-library-search';
import { FileLibraryTile } from './file-library-tile';
import { FileLibraryUploadTile } from './file-library-upload-tile';
import { FileLibraryViewToggle } from './file-library-view-toggle';

/** The open dialog's content. Mounted only while open, so its draft starts fresh each time. */
export function FileLibraryDialogBody({
  onOpenChange,
  onDone,
  selectedFileIds,
  onChange,
  ingestFiles,
  isUploading,
  disabled,
}: FileLibraryDialogBodyProps): React.ReactElement {
  const ctrl = useFileLibraryDialog({
    selectedFileIds,
    onChange,
    ingestFiles,
    isUploading,
    onOpenChange,
    onDone,
  });
  const nav = useFileLibraryNav();
  const { t, selection } = ctrl;
  const hasQuery = ctrl.query.trim().length > 0;
  const isGrid = ctrl.viewMode === FileLibraryViewMode.Grid;

  return (
    <DialogContent
      ref={nav.containerRef}
      className="short-viewport:gap-2 gap-3 overflow-y-hidden sm:max-w-2xl"
      data-testid="file-library-dialog"
    >
      <DialogHeader>
        <DialogTitle>{t('chat.fileLibrary.dialog.title')}</DialogTitle>
        <DialogDescription className="short-viewport:hidden">
          {t('chat.fileLibrary.dialog.description')}
        </DialogDescription>
      </DialogHeader>
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <FileLibrarySearch
            value={ctrl.query}
            onChange={ctrl.setQuery}
            placeholder={t('chat.fileLibrary.searchPlaceholder')}
            label={t('chat.fileLibrary.searchLabel')}
            clearLabel={t('chat.fileLibrary.clearSearch')}
          />
        </div>
        <FileLibraryViewToggle viewMode={ctrl.viewMode} onChange={ctrl.setViewMode} t={t} />
      </div>
      <FileLibraryFilterChips filter={ctrl.filter} onChange={ctrl.setFilter} t={t} />
      <Button
        type="button"
        variant="outline"
        data-library-nav=""
        disabled={disabled === true || isUploading}
        onClick={ctrl.openFilePicker}
        onDragOver={ctrl.handleDragOver}
        onDragLeave={ctrl.handleDragLeave}
        onDrop={ctrl.handleDrop}
        className={cn(
          'touch:min-h-11 h-10 w-full shrink-0 gap-2 border-dashed',
          ctrl.dragOver ? 'border-primary bg-primary/5' : null,
        )}
        data-testid="file-library-dropzone"
      >
        <Upload className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">
          {ctrl.dragOver
            ? t('chat.fileLibrary.dialog.dropActive')
            : t('chat.fileLibrary.dialog.dropHint')}
        </span>
      </Button>
      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain px-1 py-0.5"
        onDragOver={ctrl.handleDragOver}
        onDragLeave={ctrl.handleDragLeave}
        onDrop={ctrl.handleDrop}
        data-testid="file-library-list-region"
      >
        {ctrl.uploadingFiles.length === 0 ? null : (
          <ul className="mb-2 flex flex-col gap-1.5" aria-label={t('chat.fileLibrary.uploading')}>
            {ctrl.uploadingFiles.map((file, index) => (
              <FileLibraryUploadTile
                key={`${file.name}-${String(index)}`}
                file={file}
                uploadingLabel={t('chat.fileLibrary.uploading')}
              />
            ))}
          </ul>
        )}
        {ctrl.files.length === 0 ? (
          <FileLibraryListState
            isLoading={ctrl.isLoading}
            isError={ctrl.isError}
            hasQuery={hasQuery}
            hasFiles={ctrl.totalCount > 0}
            query={ctrl.query}
            t={t}
          />
        ) : (
          <ul
            className={cn(
              isGrid
                ? 'grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4'
                : 'flex flex-col gap-0.5',
            )}
            aria-label={t('chat.fileLibrary.dialog.title')}
            data-testid="file-library-items"
          >
            {ctrl.files.map((file) =>
              isGrid ? (
                <FileLibraryTile key={file.id} {...ctrl.getRowProps(file)} />
              ) : (
                <FileLibraryRow key={file.id} {...ctrl.getRowProps(file)} />
              ),
            )}
          </ul>
        )}
      </div>
      {ctrl.isAtCap ? (
        <p className="text-muted-foreground text-xs" role="status">
          {t('chat.fileLibrary.limitReached', { max: MAX_ATTACHMENTS_PER_MESSAGE })}
        </p>
      ) : null}
      <DialogFooter className="shrink-0 flex-row items-center justify-between gap-2 sm:space-x-0">
        <span className="text-muted-foreground min-w-0 truncate text-sm" aria-live="polite">
          {t('chat.fileLibrary.dialog.selectedCount', { count: ctrl.selectedCount })}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            data-library-nav=""
            onClick={ctrl.handleCancel}
          >
            {t('chat.fileLibrary.dialog.cancel')}
          </Button>
          <Button type="button" size="sm" data-library-nav="" onClick={ctrl.handleAttach}>
            {ctrl.selectedCount > 0
              ? t('chat.fileLibrary.dialog.attachCount', { count: ctrl.selectedCount })
              : t('chat.fileLibrary.dialog.done')}
          </Button>
        </span>
      </DialogFooter>
      <input
        ref={ctrl.fileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={ctrl.handleInputChange}
        disabled={isUploading}
        data-testid="file-library-dialog-input"
      />
      <ArchiveMemberDialog
        archive={ctrl.browsingArchive}
        selection={selection}
        onOpenChange={ctrl.handleArchiveDialogOpenChange}
      />
    </DialogContent>
  );
}
