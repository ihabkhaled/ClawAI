import { Paperclip, Plus } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ComposerControlVariant } from '@/enums';
import { useFileAttachmentPicker } from '@/hooks/chat/use-file-attachment-picker';
import { cn } from '@/lib/utils';
import type { FileAttachmentPickerProps } from '@/types';

import { ArchiveMemberDialog } from './archive-member-dialog';
import { FileAttachmentArchiveRow } from './file-attachment-archive-row';
import { FileAttachmentRow } from './file-attachment-row';

export function FileAttachmentPicker({
  selectedFileIds,
  onChange,
  disabled,
  variant = ComposerControlVariant.Default,
  showLabel,
}: FileAttachmentPickerProps): React.ReactElement {
  const ctrl = useFileAttachmentPicker({ selectedFileIds, onChange });
  const { t, selection } = ctrl;

  // Phase 2 mobile composer redesign — `compact` shrinks the trigger to a
  // Square icon button with optional inline label. `default` keeps the
  // historical pill button (icon + "Attach files" label hidden under sm).
  const isCompact = variant === ComposerControlVariant.Compact;
  const triggerClass = isCompact
    ? cn(
        'border-border/60 relative h-9 shrink-0 gap-1 rounded-xl px-2 text-xs',
        showLabel ? 'min-w-[6.5rem]' : 'w-9 justify-center px-0',
      )
    : 'relative h-9 gap-1 text-xs';
  const renderTriggerLabel = isCompact ? showLabel === true : true;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={triggerClass}
            disabled={disabled || ctrl.isLoading}
            aria-label={isCompact && !showLabel ? t('chat.attachFiles') : undefined}
          >
            <Paperclip className={cn('shrink-0', isCompact ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
            {renderTriggerLabel ? (
              <span className={isCompact ? 'inline' : 'hidden sm:inline'}>
                {t('chat.attachFiles')}
              </span>
            ) : null}
            {ctrl.selectedCount > 0 ? (
              <Badge
                variant="secondary"
                className={cn(
                  'touch:text-xs h-5 min-w-5 px-1 text-[10px]',
                  isCompact && !showLabel ? 'absolute -top-1 -right-1 ml-0' : 'ml-1',
                )}
              >
                {ctrl.selectedCount}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-80 w-72 max-w-[calc(100vw-1rem)] overflow-y-auto"
          onDragOver={ctrl.handleDragOver}
          onDragLeave={ctrl.handleDragLeave}
          onDrop={ctrl.handleDrop}
        >
          <DropdownMenuLabel>{t('chat.attachFiles')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => ctrl.fileInputRef.current?.click()}
              disabled={ctrl.isUploading}
            >
              <Plus className="h-3.5 w-3.5" />
              {ctrl.isUploading ? t('files.uploading') : t('files.uploadNewFile')}
            </Button>
            {ctrl.dragOver ? (
              <div className="border-primary bg-primary/5 text-muted-foreground mt-2 rounded border-2 border-dashed p-3 text-center text-xs">
                {t('files.dropFileHere')}
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          {ctrl.files.length === 0 ? (
            <div className="text-muted-foreground px-2 py-3 text-center text-xs">
              {t('chat.noFiles')}
            </div>
          ) : (
            ctrl.files.map((file) =>
              ctrl.isArchive(file) ? (
                <FileAttachmentArchiveRow
                  key={file.id}
                  file={file}
                  checked={selection.isSelected(file.id)}
                  selectedMemberCount={selection.selectedMemberCount(file.id)}
                  onToggle={selection.onToggle}
                  onBrowse={ctrl.openArchive}
                  t={t}
                />
              ) : (
                <FileAttachmentRow
                  key={file.id}
                  file={file}
                  checked={selection.isSelected(file.id)}
                  indented={false}
                  onToggle={selection.onToggle}
                />
              ),
            )
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <ArchiveMemberDialog
        archive={ctrl.browsingArchive}
        selection={selection}
        onOpenChange={ctrl.handleArchiveDialogOpenChange}
      />
      <input
        ref={ctrl.fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={ctrl.handleInputChange}
        disabled={ctrl.isUploading}
      />
    </>
  );
}
