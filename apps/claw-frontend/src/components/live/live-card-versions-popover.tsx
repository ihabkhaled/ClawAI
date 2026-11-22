import { History } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useLiveCardVersions } from '@/hooks/live/use-live-card-versions';
import type { LiveCardEventProps } from '@/types/live.types';
import { formatLiveDate } from '@/utilities/live-request.utility';

/** Earlier versions of a card that was updated in place (`GET /live/events/:id/versions`). */
export function LiveCardVersionsPopover({
  eventId,
  t,
  locale,
}: LiveCardEventProps): React.ReactElement {
  const versions = useLiveCardVersions(eventId);
  return (
    <Popover open={versions.open} onOpenChange={versions.setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <History className="h-4 w-4" aria-hidden="true" />
          {t('live.card.versions')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="flex max-h-80 w-80 flex-col gap-2 overflow-y-auto">
        <p className="text-foreground text-sm font-semibold">{t('live.card.versionsTitle')}</p>
        {versions.isLoading ? (
          <p className="text-muted-foreground text-sm">{t('live.card.versionsLoading')}</p>
        ) : null}
        {versions.isError ? (
          <p role="alert" className="text-destructive text-sm">
            {t('live.card.versionsError')}
          </p>
        ) : null}
        {!versions.isLoading && !versions.isError && versions.versions.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('live.card.versionsEmpty')}</p>
        ) : null}
        <ol className="flex flex-col gap-2">
          {versions.versions.map((entry) => (
            <li key={entry.version} className="border-border border-t pt-2 text-sm">
              <p className="text-muted-foreground text-xs">
                {t('live.card.versionLabel', { version: entry.version })} ·{' '}
                {formatLiveDate(entry.createdAt, locale)}
              </p>
              <p className="text-foreground font-medium" dir="auto">
                {entry.title}
              </p>
              <p className="text-foreground" dir="auto">
                {entry.body}
              </p>
            </li>
          ))}
        </ol>
      </PopoverContent>
    </Popover>
  );
}
