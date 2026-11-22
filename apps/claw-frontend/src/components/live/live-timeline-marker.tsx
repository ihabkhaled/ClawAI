import { Button } from '@/components/ui/button';
import type { LiveTimelineMarkerProps } from '@/types/live.types';

/** One highlight on the timeline: a real button, so Tab and Enter work without a mouse. */
export function LiveTimelineMarker({
  card,
  positionPercent,
  canSeek,
  label,
  onSeek,
}: LiveTimelineMarkerProps): React.ReactElement {
  return (
    <Button
      variant="unstyled"
      size="unstyled"
      aria-label={label}
      title={label}
      disabled={!canSeek}
      onClick={() => onSeek(card.startAt)}
      className="bg-foreground focus-visible:ring-ring absolute top-1/2 h-4 w-2 -translate-x-1/2 -translate-y-1/2 rounded-sm rtl:translate-x-1/2"
      style={{ insetInlineStart: `${positionPercent}%` }}
      data-testid={`live-marker-${card.eventId}`}
    />
  );
}
