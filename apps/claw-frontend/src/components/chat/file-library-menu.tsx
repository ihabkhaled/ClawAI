import { ChevronRight, FolderOpen, Loader2, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MAX_ATTACHMENTS_PER_MESSAGE } from '@/constants/composer-attachment.constants';
import { useFileLibraryMenu } from '@/hooks/chat/use-file-library-menu';
import { useFileLibraryNav } from '@/hooks/chat/use-file-library-nav';
import { cn } from '@/lib/utils';
import type { FileLibraryMenuInnerProps } from '@/types/file-library-ui.types';

import { ArchiveMemberDialog } from './archive-member-dialog';
import { FileLibraryDialog } from './file-library-dialog';
import { FileLibraryListState } from './file-library-list-states';
import { FileLibraryRow } from './file-library-row';
import { FileLibrarySearch } from './file-library-search';

/**
 * The file half of the composer's "+" menu: search, upload, the most recent
 * files with thumbnails, and "Browse all" for the rest. One component for every
 * surface (chat, Compare, in-thread Compare, the labs), so a change here reaches
 * them all. It is content only: the host supplies the menu or popover around it.
 */
export function FileLibraryMenu(props: FileLibraryMenuInnerProps): React.ReactElement {
  const { selectedFileIds, onChange, ingestFiles, isUploading, disabled, onBrowseAll, onDone } =
    props;
  const ctrl = useFileLibraryMenu(props);
  const nav = useFileLibraryNav();
  const { t, selection } = ctrl;
  const hasQuery = ctrl.query.trim().length > 0;

  return (
    <div
      ref={nav.containerRef}
      role="group"
      aria-label={t('chat.fileLibrary.dialog.title')}
      onDragOver={ctrl.handleDragOver}
      onDragLeave={ctrl.handleDragLeave}
      onDrop={ctrl.handleDrop}
      className={cn(
        'flex w-full min-w-0 flex-col gap-1 p-2',
        ctrl.dragOver ? 'bg-primary/5 ring-primary/40 rounded-lg ring-2' : null,
      )}
      data-testid="file-library-menu"
    >
      <FileLibrarySearch
        value={ctrl.query}
        onChange={ctrl.setQuery}
        placeholder={t('chat.fileLibrary.searchPlaceholder')}
        label={t('chat.fileLibrary.searchLabel')}
        clearLabel={t('chat.fileLibrary.clearSearch')}
      />
      <Button
        type="button"
        variant="ghost"
        data-library-nav=""
        disabled={disabled === true || isUploading}
        onClick={ctrl.openFilePicker}
        className="touch:min-h-11 h-12 w-full justify-start gap-3 px-2"
      >
        <span className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
        </span>
        <span className="truncate">
          {isUploading ? t('chat.fileLibrary.uploading') : t('chat.fileLibrary.upload')}
        </span>
      </Button>
      {ctrl.dragOver ? (
        <p className="text-primary px-2 py-1 text-center text-xs" role="status">
          {t('files.dropFileHere')}
        </p>
      ) : null}

      <p className="text-muted-foreground px-2 pt-1 text-xs font-medium">
        {hasQuery ? t('chat.fileLibrary.results') : t('chat.fileLibrary.recent')}
      </p>
      <div
        className={cn(
          'min-h-0 px-1 py-0.5',
          // Only a search can return enough rows to need its own scroller; the short
          // "recent" list stays flat so the menu scrolls as one (no scroll inside scroll).
          hasQuery ? 'short-viewport:max-h-[30dvh] max-h-[40dvh] overflow-y-auto' : null,
        )}
      >
        {ctrl.files.length === 0 ? (
          <FileLibraryListState
            isLoading={ctrl.isLoading}
            isError={ctrl.isError}
            hasQuery={hasQuery}
            query={ctrl.query}
            t={t}
          />
        ) : (
          <ul className="flex flex-col gap-0.5" aria-label={t('chat.fileLibrary.recent')}>
            {ctrl.files.map((file) => (
              <FileLibraryRow
                key={file.id}
                file={file}
                checked={selection.isSelected(file.id)}
                disabled={ctrl.isDisabled(file)}
                selectedMemberCount={selection.selectedMemberCount(file.id)}
                onToggle={ctrl.toggleFile}
                onBrowseArchive={ctrl.openArchive}
              />
            ))}
          </ul>
        )}
      </div>
      {ctrl.isAtCap ? (
        <p className="text-muted-foreground px-2 text-xs" role="status">
          {t('chat.fileLibrary.limitReached', { max: MAX_ATTACHMENTS_PER_MESSAGE })}
        </p>
      ) : null}

      <Separator className="my-1" />
      <Button
        type="button"
        variant="ghost"
        data-library-nav=""
        onClick={ctrl.handleBrowseAll}
        className="touch:min-h-11 h-10 w-full justify-start gap-3 px-2"
      >
        <FolderOpen className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="flex-1 truncate text-start">{t('chat.fileLibrary.browseAll')}</span>
        <ChevronRight
          className="text-muted-foreground h-4 w-4 shrink-0 rtl:rotate-180"
          aria-hidden="true"
        />
      </Button>

      <input
        ref={ctrl.fileInputRef}
        type="file"
        accept="*/*"
        multiple
        className="hidden"
        onChange={ctrl.handleInputChange}
        disabled={isUploading}
        data-testid="file-library-input"
      />
      <ArchiveMemberDialog
        archive={ctrl.browsingArchive}
        selection={selection}
        onOpenChange={ctrl.handleArchiveDialogOpenChange}
      />
      {onBrowseAll === undefined ? (
        <FileLibraryDialog
          open={ctrl.dialogOpen}
          onOpenChange={ctrl.setDialogOpen}
          selectedFileIds={selectedFileIds}
          onChange={onChange}
          ingestFiles={ingestFiles}
          isUploading={isUploading}
          disabled={disabled}
          onDone={onDone}
        />
      ) : null}
    </div>
  );
}
