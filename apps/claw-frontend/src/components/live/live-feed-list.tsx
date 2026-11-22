import { LiveFeedCardItem } from '@/components/live/live-feed-card';
import { useLiveFeedScroll } from '@/hooks/live/use-live-feed-scroll';
import type { LiveFeedListProps } from '@/types/live.types';

/** Revealed cards, oldest first; follows new cards only while the reader is at the bottom. */
export function LiveFeedList({
  cards,
  t,
  locale,
  allowEnhance,
  emptyLabel,
}: LiveFeedListProps): React.ReactElement {
  const scroll = useLiveFeedScroll(cards.length);
  return (
    <div
      ref={scroll.containerRef}
      onScroll={scroll.onScroll}
      className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pe-1"
    >
      {cards.length === 0 ? <p className="text-muted-foreground text-sm">{emptyLabel}</p> : null}
      {cards.map((card) => (
        <LiveFeedCardItem
          key={card.eventId}
          card={card}
          t={t}
          locale={locale}
          allowEnhance={allowEnhance}
        />
      ))}
    </div>
  );
}
