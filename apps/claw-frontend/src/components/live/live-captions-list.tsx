import { useLiveFeedScroll } from '@/hooks/live/use-live-feed-scroll';
import type { LiveCaptionsListProps } from '@/types/live.types';
import { formatLiveClock } from '@/utilities/live-request.utility';

/** The revealed caption transcript, already in the viewer's language (`revealLiveCaptions`). */
export function LiveCaptionsList({
  captions,
  t,
  locale,
}: LiveCaptionsListProps): React.ReactElement {
  const scroll = useLiveFeedScroll(captions.length);
  return (
    <div
      ref={scroll.containerRef}
      onScroll={scroll.onScroll}
      className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pe-1"
    >
      {captions.length === 0 ? (
        <p className="border-border text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
          <span
            className="bg-primary h-2 w-2 shrink-0 animate-pulse rounded-full"
            aria-hidden="true"
          />
          {t('live.modal.captionsEmpty')}
        </p>
      ) : null}
      {captions.map((caption) => (
        <p
          key={caption.segmentId}
          className="text-foreground hover:bg-muted/50 last:bg-primary/5 rounded-lg px-2 py-1 text-sm leading-relaxed transition-colors"
          dir="auto"
        >
          <span className="text-muted-foreground me-2 text-xs tabular-nums">
            {formatLiveClock(caption.startAt, locale)}
          </span>
          {caption.text}
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
