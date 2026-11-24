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
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pe-1"
    >
      {cards.length === 0 ? (
        <p className="border-border text-muted-foreground flex items-center gap-2 rounded-xl border border-dashed p-4 text-sm">
          <span
            className="bg-primary h-2 w-2 shrink-0 animate-pulse rounded-full"
            aria-hidden="true"
          />
          {emptyLabel}
        </p>
      ) : null}
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
