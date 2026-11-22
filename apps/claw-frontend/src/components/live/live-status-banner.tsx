import { LIVE_STATUS_PRESENTATION, LIVE_STATUS_TONE_CLASSES } from '@/constants/live.constants';
import type { LiveStatusBannerProps } from '@/types/live.types';
import { cn } from '@/utilities';

/** The one status line for the session. Every code has its own text; nothing claims a success it did not see. */
export function LiveStatusBanner({
  status,
  isReconnecting,
  isLost,
  t,
}: LiveStatusBannerProps): React.ReactElement {
  const presentation = LIVE_STATUS_PRESENTATION[status];
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-1 rounded-md border p-3 text-sm',
        LIVE_STATUS_TONE_CLASSES[presentation.tone],
      )}
      data-testid={`live-status-${status}`}
    >
      <p className="font-semibold">{t(presentation.titleKey)}</p>
      <p>{t(presentation.descriptionKey)}</p>
      {isLost ? <p>{t('live.modal.connectionLost')}</p> : null}
      {!isLost && isReconnecting ? <p>{t('live.modal.reconnecting')}</p> : null}
    </div>
  );
}
