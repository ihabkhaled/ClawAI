import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { FileIngestionStatus } from '@/enums';
import type { FileAttachmentRowProps } from '@/types';

export function FileAttachmentRow({
  file,
  checked,
  indented,
  onToggle,
}: FileAttachmentRowProps): React.ReactElement {
  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onCheckedChange={(next) => onToggle(file.id, next === true)}
      onSelect={(e) => e.preventDefault()}
      className={indented ? 'pl-8' : undefined}
    >
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="truncate text-sm">{file.filename}</span>
        <span className="touch:text-xs text-muted-foreground text-[10px]">
          {file.ingestionStatus === FileIngestionStatus.COMPLETED
            ? FileIngestionStatus.COMPLETED
            : file.ingestionStatus}
        </span>
      </div>
    </DropdownMenuCheckboxItem>
  );
}
