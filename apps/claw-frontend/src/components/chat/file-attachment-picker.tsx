import { ChevronDown, ChevronRight, Paperclip, Plus } from 'lucide-react';

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
import { useFileAttachmentPickerState } from '@/hooks/chat/use-file-attachment-picker-state';
import { useFileAttachmentGrouping } from '@/hooks/files/use-file-attachment-grouping';
import { useFiles } from '@/hooks/files/use-files';
import { useUploadFile } from '@/hooks/files/use-upload-file';
import { useTranslation } from '@/lib/i18n/use-translation';
import { cn } from '@/lib/utils';
import type { FileAttachmentPickerProps } from '@/types';

import { FileAttachmentRow } from './file-attachment-row';

export function FileAttachmentPicker({
  selectedFileIds,
  onChange,
  disabled,
  variant = ComposerControlVariant.Default,
  showLabel,
}: FileAttachmentPickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { files, isLoading } = useFiles();
  const { uploadFile, isPending: isUploading } = useUploadFile();
  const {
    dragOver,
    fileInputRef,
    handleToggle,
    handleInputChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    selectedCount,
  } = useFileAttachmentPickerState({ selectedFileIds, onChange, uploadFile });

  const { groups, standalone, hasGroups, isParentExpanded, toggleParentExpansion } =
    useFileAttachmentGrouping(files);

  // Phase 2 mobile composer redesign — `compact` shrinks the trigger to a
  // 32px square icon button with optional inline label. `default` keeps the
  // historical pill button (icon + "Attach files" label hidden under sm).
  const isCompact = variant === ComposerControlVariant.Compact;
  const triggerClass = isCompact
    ? cn(
        'relative h-8 gap-1 rounded-xl border-border/60 px-2 text-xs',
        showLabel ? 'min-w-[6.5rem]' : 'w-8 justify-center px-0',
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
            disabled={disabled || isLoading}
            aria-label={isCompact && !showLabel ? t('chat.attachFiles') : undefined}
          >
            <Paperclip className={cn('shrink-0', isCompact ? 'h-4 w-4' : 'h-3.5 w-3.5')} />
            {renderTriggerLabel ? (
              <span className={isCompact ? 'inline' : 'hidden sm:inline'}>
                {t('chat.attachFiles')}
              </span>
            ) : null}
            {selectedCount > 0 ? (
              <Badge
                variant="secondary"
                className={cn(
                  'h-5 min-w-5 px-1 text-[10px]',
                  isCompact && !showLabel ? 'absolute -top-1 -right-1 ml-0' : 'ml-1',
                )}
              >
                {selectedCount}
              </Badge>
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="max-h-80 w-72 overflow-y-auto"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <DropdownMenuLabel>{t('chat.attachFiles')}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-1.5 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Plus className="h-3.5 w-3.5" />
              {isUploading ? t('files.uploading') : t('files.uploadNewFile')}
            </Button>
            {dragOver ? (
              <div className="border-primary bg-primary/5 text-muted-foreground mt-2 rounded border-2 border-dashed p-3 text-center text-xs">
                {t('files.dropFileHere')}
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          {files.length === 0 ? (
            <div className="text-muted-foreground px-2 py-3 text-center text-xs">
              {t('chat.noFiles')}
            </div>
          ) : (
            <>
              {hasGroups
                ? groups.map((group) => {
                    const expanded = isParentExpanded(group.parent.id);
                    return (
                      <div key={group.parent.id} className="flex flex-col">
                        <FileAttachmentRow
                          file={group.parent}
                          checked={selectedFileIds.includes(group.parent.id)}
                          indented={false}
                          onToggle={handleToggle}
                        />
                        <Button
                          variant="unstyled"
                          size="unstyled"
                          type="button"
                          className="text-muted-foreground hover:bg-accent/40 flex items-center gap-1.5 px-2 py-1 text-left text-[11px]"
                          onClick={() => toggleParentExpansion(group.parent.id)}
                          aria-expanded={expanded}
                        >
                          {expanded ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span className="truncate">
                            {t('files.zip.extractedFromLabel', {
                              filename: group.parent.filename,
                            })}
                          </span>
                          <Badge variant="secondary" className="ml-auto h-4 px-1 text-[10px]">
                            {t('files.zip.childCountLabel', { count: group.children.length })}
                          </Badge>
                        </Button>
                        {expanded
                          ? group.children.map((child) => (
                              <FileAttachmentRow
                                key={child.id}
                                file={child}
                                checked={selectedFileIds.includes(child.id)}
                                indented
                                onToggle={handleToggle}
                              />
                            ))
                          : null}
                      </div>
                    );
                  })
                : null}
              {standalone.map((file) => (
                <FileAttachmentRow
                  key={file.id}
                  file={file}
                  checked={selectedFileIds.includes(file.id)}
                  indented={false}
                  onToggle={handleToggle}
                />
              ))}
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />
    </>
  );
}
