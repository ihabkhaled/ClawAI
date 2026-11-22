import { LiveTimelineMarker } from '@/components/live/live-timeline-marker';
import { LIVE_HIGHLIGHT_TYPE_KEYS } from '@/constants/live.constants';
import { LiveHighlightType } from '@/enums/live.enum';
import type { LiveTimelineProps } from '@/types/live.types';
import { formatLiveClock } from '@/utilities/live-request.utility';
import { isWithinSeekable, liveMarkerPercent } from '@/utilities/live-reveal.utility';

/**
 * Highlights placed by media time across the replay window. A marker inside the window seeks there;
 * one that scrolled out of it is shown but disabled. Every marker is a focusable button.
 */
export function LiveTimeline({
  highlights,
  seekable,
  playbackAt,
  t,
  locale,
  onSeek,
}: LiveTimelineProps): React.ReactElement {
  return (
    <div
      role="group"
      aria-label={t('live.modal.timelineLabel')}
      className="bg-muted relative h-8 w-full rounded-md"
      data-testid="live-timeline"
    >
      <div
        aria-hidden="true"
        className="bg-primary absolute inset-y-1 w-0.5 rounded"
        style={{ insetInlineStart: `${liveMarkerPercent(playbackAt, seekable)}%` }}
      />
      {highlights.map((card) => {
        const canSeek = isWithinSeekable(card.startAt, seekable);
        const params = {
          type: t(LIVE_HIGHLIGHT_TYPE_KEYS[card.highlightType ?? LiveHighlightType.OTHER]),
          time: formatLiveClock(card.startAt, locale),
        };
        return (
          <LiveTimelineMarker
            key={card.eventId}
            card={card}
            positionPercent={liveMarkerPercent(card.startAt, seekable)}
            canSeek={canSeek}
            label={
              canSeek
                ? t('live.modal.markerLabel', params)
                : t('live.modal.markerOutOfRange', params)
            }
            onSeek={onSeek}
          />
        );
      })}
    </div>
  );
}
