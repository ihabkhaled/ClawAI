import { Paperclip, Plus } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileIngestionStatus } from '@/enums';
import { useFiles } from '@/hooks/files/use-files';
import { useUploadFile } from '@/hooks/files/use-upload-file';
import { useTranslation } from '@/lib/i18n/use-translation';
import { uploadFileSchema } from '@/lib/validation/file.schema';
import type { FileAttachmentPickerProps, UploadFileRequest } from '@/types';

export function FileAttachmentPicker({
  selectedFileIds,
  onChange,
  disabled,
}: FileAttachmentPickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { files, isLoading } = useFiles();
  const { uploadFile, isPending: isUploading } = useUploadFile();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleToggle = (fileId: string, checked: boolean): void => {
    if (checked) {
      onChange([...selectedFileIds, fileId]);
    } else {
      onChange(selectedFileIds.filter((id) => id !== fileId));
    }
  };

  const handleFileUpload = useCallback(
    (file: File) => {
      const metadata = {
        filename: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      };

      const result = uploadFileSchema.safeParse(metadata);
      if (!result.success) {
        return;
      }

      const reader = new FileReader();
      reader.onload = (): void => {
        const base64 = (reader.result as string).split(',')[1] ?? '';
        const data: UploadFileRequest = {
          ...result.data,
          storagePath: `/uploads/${file.name}`,
          content: base64,
        };
        uploadFile(data);
      };
      reader.readAsDataURL(file);
    },
    [uploadFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFileUpload(selectedFile);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileUpload(droppedFile);
      }
    },
    [handleFileUpload],
  );

  const selectedCount = selectedFileIds.length;

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
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
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
              {isUploading ? 'Uploading...' : 'Upload new file'}
            </Button>
            {dragOver ? (
              <div className="mt-2 rounded border-2 border-dashed border-primary bg-primary/5 p-3 text-center text-xs text-muted-foreground">
                Drop file here
              </div>
            ) : null}
          </div>
          <DropdownMenuSeparator />
          {files.length === 0 ? (
            <div className="px-2 py-3 text-center text-xs text-muted-foreground">
              {t('chat.noFiles')}
            </div>
          ) : (
            files.map((file) => (
              <DropdownMenuCheckboxItem
                key={file.id}
                checked={selectedFileIds.includes(file.id)}
                onCheckedChange={(checked) => handleToggle(file.id, checked === true)}
                onSelect={(e) => e.preventDefault()}
              >
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  <span className="truncate text-sm">{file.filename}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {file.ingestionStatus === FileIngestionStatus.COMPLETED
                      ? FileIngestionStatus.COMPLETED
                      : file.ingestionStatus}
                  </span>
                </div>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleInputChange}
        disabled={isUploading}
      />
    </>
  );
}
