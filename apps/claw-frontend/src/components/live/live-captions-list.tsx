import { useLiveFeedScroll } from '@/hooks/live/use-live-feed-scroll';
import type { LiveCaptionsListProps } from '@/types/live.types';
import { formatLiveClock } from '@/utilities/live-request.utility';
import { captionText } from '@/utilities/live-reveal.utility';

/** The revealed caption transcript, in the session language where a translation arrived. */
export function LiveCaptionsList({
  captions,
  translations,
  t,
  locale,
}: LiveCaptionsListProps): React.ReactElement {
  const scroll = useLiveFeedScroll(captions.length);
  return (
    <div
      ref={scroll.containerRef}
      onScroll={scroll.onScroll}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pe-1"
    >
      {captions.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t('live.modal.captionsEmpty')}</p>
      ) : null}
      {captions.map((caption) => (
        <p key={caption.segmentId} className="text-foreground text-sm" dir="auto">
          <span className="text-muted-foreground me-2 text-xs">
            {formatLiveClock(caption.startAt, locale)}
          </span>
          {captionText(caption, translations)}
          {caption.uncertain ? (
            <span className="text-muted-foreground ms-2 text-xs">
              ({t('live.modal.uncertain')})
            </span>
          ) : null}
        </p>
      ))}
    </div>
  );
}
