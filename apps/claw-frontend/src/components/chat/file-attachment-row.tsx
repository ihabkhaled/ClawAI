import { Mic, Video } from 'lucide-react';

import { DropdownMenuCheckboxItem } from '@/components/ui/dropdown-menu';
import { INGESTION_STATUS_LABELS } from '@/constants';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { FileAttachmentRowProps } from '@/types';
import {
  getIngestionStatusIcon,
  isAudioMime,
  isVideoMime,
} from '@/utilities/file-type-icon.utility';

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
  const statusLabel = statusKey === undefined ? file.ingestionStatus : t(statusKey);
  const { Icon: StatusIcon, spin } = getIngestionStatusIcon(file.ingestionStatus);

  // A voice/video note must read as something the user SPOKE, not a document
  // they attached — a recorded clip and an uploaded PDF share nothing in what
  // they mean to the model, and rendering them identically hides that.
  const isVoiceNote = isAudioMime(file.mimeType);
  const isVideoNote = isVideoMime(file.mimeType);
  let KindIcon: typeof Mic | null = null;
  let kindLabel: string | null = null;
  if (isVoiceNote) {
    KindIcon = Mic;
    kindLabel = t('chat.attachment.voiceNote');
  } else if (isVideoNote) {
    KindIcon = Video;
    kindLabel = t('chat.attachment.videoNote');
  }

  return (
    <DropdownMenuCheckboxItem
      checked={checked}
      onCheckedChange={(next) => onToggle(file.id, next === true)}
      onSelect={(e) => e.preventDefault()}
      className={indented ? 'pl-8' : undefined}
    >
      <div className="flex flex-col gap-0.5 overflow-hidden">
        <span className="flex min-w-0 items-center gap-1.5 text-sm">
          {KindIcon === null ? null : (
            <KindIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className="truncate">{file.filename}</span>
        </span>
        {kindLabel === null ? null : (
          <span className="touch:text-xs text-muted-foreground text-[10px]">{kindLabel}</span>
        )}
        <span className="touch:text-xs text-muted-foreground flex items-center gap-1 text-[10px]">
          <StatusIcon
            className={spin ? 'h-3 w-3 shrink-0 animate-spin' : 'h-3 w-3 shrink-0'}
            aria-hidden="true"
          />
          {statusLabel}
        </span>
      </div>
    </DropdownMenuCheckboxItem>
  );
}
