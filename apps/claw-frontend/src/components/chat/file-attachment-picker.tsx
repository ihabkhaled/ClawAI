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
import { useFileAttachmentPickerState } from '@/hooks/chat/use-file-attachment-picker-state';
import { useFileAttachmentGrouping } from '@/hooks/files/use-file-attachment-grouping';
import { useFiles } from '@/hooks/files/use-files';
import { useUploadFile } from '@/hooks/files/use-upload-file';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { FileAttachmentPickerProps } from '@/types';

import { FileAttachmentRow } from './file-attachment-row';

export function FileAttachmentPicker({
  selectedFileIds,
  onChange,
  disabled,
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="relative h-9 gap-1 text-xs"
            disabled={disabled || isLoading}
          >
            <Paperclip className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('chat.attachFiles')}</span>
            {selectedCount > 0 ? (
              <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1 text-[10px]">
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
              <div className="mt-2 rounded border-2 border-dashed border-primary bg-primary/5 p-3 text-center text-xs text-muted-foreground">
                {t('files.dropFileHere')}
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          {files.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
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
                        <button
                          type="button"
                          className="flex items-center gap-1.5 px-2 py-1 text-left text-[11px] text-muted-foreground hover:bg-accent/40"
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
                        </button>
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
