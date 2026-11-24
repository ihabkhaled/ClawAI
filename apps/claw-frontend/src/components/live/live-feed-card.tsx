import { LiveCardEnhance } from '@/components/live/live-card-enhance';
import { LiveCardVersionsPopover } from '@/components/live/live-card-versions-popover';
import { Badge } from '@/components/ui/badge';
import {
  LIVE_CARD_ACCENT_CLASSES,
  LIVE_FEED_KIND_KEYS,
  LIVE_HIGHLIGHT_TYPE_KEYS,
  LIVE_IMPORTANCE_DOTS,
} from '@/constants/live.constants';
import type { LiveFeedCardProps } from '@/types/live.types';
import { cn } from '@/utilities';
import { formatLiveClock } from '@/utilities/live-request.utility';

/**
 * One summary, highlight or visual card; translated text when the session language has it. A coloured
 * start-edge stripe tells the kind apart at a glance, importance is three dots (the number stays in
 * the accessible name), and the actions sit quietly at the end of the card.
 */
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
  const importanceLabel = t('live.card.importance', { value: card.importance });
  return (
    <article
      className={cn(
        'border-border bg-card/70 hover:bg-card flex flex-col gap-2 rounded-xl border border-s-4 p-3 shadow-sm transition-colors',
        LIVE_CARD_ACCENT_CLASSES[card.kind],
      )}
      data-testid={`live-card-${card.eventId}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge variant={card.highlightType === null ? 'secondary' : 'info'}>{label}</Badge>
        <time className="text-muted-foreground tabular-nums">
          {formatLiveClock(card.startAt, locale)}
        </time>
        {card.importance > 0 ? (
          <span
            className="ms-auto flex items-center gap-1"
            role="img"
            aria-label={importanceLabel}
            title={importanceLabel}
          >
            {LIVE_IMPORTANCE_DOTS.map((dot) => (
              <span
                key={dot}
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  dot <= card.importance ? 'bg-primary' : 'bg-muted',
                )}
              />
            ))}
          </span>
        ) : null}
      </div>
      {card.title ? (
        <h3 className="text-foreground text-sm leading-snug font-semibold" dir="auto">
          {card.translatedTitle ?? card.title}
        </h3>
      ) : null}
      <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-line" dir="auto">
        {card.translatedBody ?? card.body}
      </p>
      {card.version > 1 || allowEnhance ? (
        <div className="-mb-1 flex flex-wrap items-center justify-end gap-1">
          {card.version > 1 ? (
            <LiveCardVersionsPopover eventId={card.eventId} t={t} locale={locale} />
          ) : null}
          {allowEnhance ? <LiveCardEnhance eventId={card.eventId} t={t} locale={locale} /> : null}
        </div>
      ) : null}
    </article>
  );
}
