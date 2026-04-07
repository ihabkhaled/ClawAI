import { Paperclip } from 'lucide-react';

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
import { useTranslation } from '@/lib/i18n/use-translation';
import type { FileAttachmentPickerProps } from '@/types';

export function FileAttachmentPicker({
  selectedFileIds,
  onChange,
  disabled,
}: FileAttachmentPickerProps): React.ReactElement {
  const { t } = useTranslation();
  const { files, isLoading } = useFiles();

  const handleToggle = (fileId: string, checked: boolean): void => {
    if (checked) {
      onChange([...selectedFileIds, fileId]);
    } else {
      onChange(selectedFileIds.filter((id) => id !== fileId));
    }
  };

  const selectedCount = selectedFileIds.length;

  return (
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
      <DropdownMenuContent align="start" className="max-h-64 w-64 overflow-y-auto">
        <DropdownMenuLabel>{t('chat.attachFiles')}</DropdownMenuLabel>
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
  );
}
