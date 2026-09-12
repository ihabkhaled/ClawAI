import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { INGESTION_STATUS_LABELS } from '@/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { FileAttachmentRowProps } from '@/types';

export function FileAttachmentRow({
  file,
  checked,
  indented,
  onToggle,
}: FileAttachmentRowProps): React.ReactElement {
  const { t } = useTranslation();
  // Raw enum names used to be rendered here, in every locale. It went unnoticed
  // because the status column always said COMPLETED — nothing ever extracted a
  // file, so PENDING and PROCESSING were states no user could reach. Now that
  // extraction actually runs they are on screen, and they have to be words.
  const statusKey = INGESTION_STATUS_LABELS[file.ingestionStatus];

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
          {statusKey === undefined ? file.ingestionStatus : t(statusKey)}
        </span>
      </div>
    </DropdownMenuCheckboxItem>
  );
}
