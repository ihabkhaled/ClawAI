import { LiveCardEnhance } from '@/components/live/live-card-enhance';
import { LiveCardVersionsPopover } from '@/components/live/live-card-versions-popover';
import { Badge } from '@/components/ui/badge';
import { LIVE_FEED_KIND_KEYS, LIVE_HIGHLIGHT_TYPE_KEYS } from '@/constants/live.constants';
import type { LiveFeedCardProps } from '@/types/live.types';
import { formatLiveClock } from '@/utilities/live-request.utility';

/** One summary, highlight or visual card; translated text when the session language has it. */
export function LiveFeedCardItem({
  card,
  t,
  locale,
  allowEnhance,
}: LiveFeedCardProps): React.ReactElement {
  const label =
    card.highlightType === null
      ? t(LIVE_FEED_KIND_KEYS[card.kind])
      : t(LIVE_HIGHLIGHT_TYPE_KEYS[card.highlightType]);
  return (
    <article
      className="border-border bg-card flex flex-col gap-2 rounded-md border p-3"
      data-testid={`live-card-${card.eventId}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={card.highlightType === null ? 'secondary' : 'info'}>{label}</Badge>
        <span className="text-muted-foreground">{formatLiveClock(card.startAt, locale)}</span>
        {card.importance > 0 ? (
          <span className="text-muted-foreground">
            {t('live.card.importance', { value: card.importance })}
          </span>
        ) : null}
      </div>
      {card.title ? (
        <h3 className="text-foreground text-sm font-semibold" dir="auto">
          {card.translatedTitle ?? card.title}
        </h3>
      ) : null}
      <p className="text-foreground text-sm whitespace-pre-line" dir="auto">
        {card.translatedBody ?? card.body}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {card.version > 1 ? (
          <LiveCardVersionsPopover eventId={card.eventId} t={t} locale={locale} />
        ) : null}
        {allowEnhance ? <LiveCardEnhance eventId={card.eventId} t={t} locale={locale} /> : null}
      </div>
    </article>
  );
}
