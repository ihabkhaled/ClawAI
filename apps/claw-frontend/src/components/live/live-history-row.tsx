import { ChevronDown, Download, Radio, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LIVE_EXPORT_OPTIONS } from '@/constants/live.constants';
import type { LiveHistoryRowProps } from '@/types/live.types';
import { formatLiveDate, liveSecondsToWholeMinutes } from '@/utilities/live-request.utility';

/** One past session: open its feed, export it (one menu, three formats), or delete it. */
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
      className="border-border bg-card/70 hover:bg-card flex flex-col gap-3 rounded-xl border p-3 transition-colors md:flex-row md:items-center md:justify-between"
      data-testid={`live-history-row-${item.id}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <span className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Radio className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
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
      </div>
      <div className="flex shrink-0 items-center gap-2 self-end md:self-auto">
        <Button size="sm" onClick={() => onOpen(item.id)}>
          {t('live.history.open')}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={isPending}>
              <Download className="h-4 w-4" aria-hidden="true" />
              {t('live.history.export')}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {LIVE_EXPORT_OPTIONS.map((option) => (
              <DropdownMenuItem
                key={option.format}
                onSelect={() => onExport(item.id, option.format)}
              >
                {t(option.labelKey)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
