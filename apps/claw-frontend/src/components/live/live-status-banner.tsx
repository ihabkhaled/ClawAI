import { LIVE_STATUS_TONE_CLASSES } from '@/constants/live.constants';
import type { LiveStatusBannerProps } from '@/types/live.types';
import { cn } from '@/utilities';

/** The one status line for the session. Every code has its own text; nothing claims a success it did not see. */
export function LiveStatusBanner({
  status,
  presentation,
  isReconnecting,
  isLost,
  t,
}: LiveStatusBannerProps): React.ReactElement {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col gap-0.5 rounded-xl border px-3 py-2 text-xs sm:text-sm',
        LIVE_STATUS_TONE_CLASSES[presentation.tone],
      )}
      data-testid={`live-status-${status}`}
    >
      <p className="font-semibold">{t(presentation.titleKey)}</p>
      <p className="text-muted-foreground hidden sm:block">{t(presentation.descriptionKey)}</p>
      {isLost ? <p>{t('live.modal.connectionLost')}</p> : null}
      {!isLost && isReconnecting ? <p>{t('live.modal.reconnecting')}</p> : null}
    </div>
  );
}
