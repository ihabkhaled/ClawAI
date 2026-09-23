import type { ReactElement } from 'react';

import { useTranslation } from '@/lib/i18n/use-translation';
import type { UploadProgressIndicatorProps } from '@/types';
import { formatUploadDuration, formatUploadSpeed } from '@/utilities/chunked-upload.utility';

/**
 * Percent bar + ETA + elapsed + speed, shared by every upload surface
 * (paperclip, drag-drop, paste, and the voice/video recorder) via
 * `useComposerAttachments` — one component, not a copy per surface.
 *
 * `aria-live="polite"` on the text line means a screen-reader user gets the
 * same "how much longer" answer a sighted user reads off the bar, not just a
 * silent progress fill.
 */
export function UploadProgressIndicator({ progress }: UploadProgressIndicatorProps): ReactElement {
  const { t } = useTranslation();
  const etaText =
    progress.etaSeconds === null
      ? t('files.uploadProgress.etaUnknown')
      : t('files.uploadProgress.etaLabel', { eta: formatUploadDuration(progress.etaSeconds) });

  return (
    <div className="w-full space-y-1" data-testid="upload-progress-indicator">
      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress.percent}
      >
        <div
          className="bg-primary h-full rounded-full transition-[width]"
          style={{ width: `${String(progress.percent)}%` }}
          data-testid="upload-progress-bar-fill"
        />
      </div>
      <p
        className="text-muted-foreground flex flex-wrap gap-x-2 text-xs tabular-nums"
        aria-live="polite"
        data-testid="upload-progress-text"
      >
        <span>{t('files.uploadProgress.percentLabel', { percent: progress.percent })}</span>
        <span>{etaText}</span>
        <span>
          {t('files.uploadProgress.speedLabel', {
            speed: formatUploadSpeed(progress.bytesPerSecond),
          })}
        </span>
        <span>
          {t('files.uploadProgress.elapsedLabel', {
            elapsed: formatUploadDuration(progress.elapsedSeconds),
          })}
        </span>
      </p>
    </div>
  );
}
