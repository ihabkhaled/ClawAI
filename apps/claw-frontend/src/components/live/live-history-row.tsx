import { Download, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { LIVE_EXPORT_OPTIONS } from '@/constants/live.constants';
import type { LiveHistoryRowProps } from '@/types/live.types';
import { formatLiveDate, liveSecondsToWholeMinutes } from '@/utilities/live-request.utility';

/** One past session: open its feed, export it in three formats, or delete it. */
export function LiveHistoryRow({
  item,
  isPending,
  t,
  locale,
  onOpen,
  onDelete,
  onExport,
}: LiveHistoryRowProps): React.ReactElement {
  return (
    <li
      className="border-border bg-card flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-center md:justify-between"
      data-testid={`live-history-row-${item.id}`}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-foreground truncate text-sm font-medium">
          {item.title ?? t('live.history.untitled')}
        </p>
        {item.sourceUrl === null ? null : (
          <p className="text-muted-foreground truncate text-xs" dir="ltr">
            {item.sourceUrl}
          </p>
        )}
        <p className="text-muted-foreground text-xs">
          {formatLiveDate(item.startedAt, locale)} ·{' '}
          {t('live.history.watchedMinutes', {
            minutes: liveSecondsToWholeMinutes(item.billedSeconds),
          })}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => onOpen(item.id)}>
          {t('live.history.open')}
        </Button>
        <div role="group" aria-label={t('live.history.export')} className="flex items-center gap-1">
          <Download className="text-muted-foreground h-4 w-4" aria-hidden="true" />
          {LIVE_EXPORT_OPTIONS.map((option) => (
            <Button
              key={option.format}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => onExport(item.id, option.format)}
            >
              {t(option.labelKey)}
            </Button>
          ))}
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          aria-label={t('live.history.delete')}
          disabled={isPending}
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}
