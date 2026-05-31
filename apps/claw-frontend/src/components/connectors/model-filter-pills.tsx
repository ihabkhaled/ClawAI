// Visualises the active filter set above the Models page table/grid as a row
// of dismissable pills plus an "active count" badge and a "Clear all" CTA.
// When zero filters are active, nothing renders — the parent doesn't need to
// gate this with conditional logic.
import { X } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { ModelFilterPillsProps } from '@/types';

export function ModelFilterPills({
  pills,
  onClearAll,
}: ModelFilterPillsProps): React.ReactElement | null {
  const { t } = useTranslation();

  if (pills.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/30 p-2">
      <Badge variant="default" className="text-[11px]">
        {t('models.filters.activeCount', { count: pills.length })}
      </Badge>
      {pills.map((pill) => (
        <Badge key={pill.id} variant="secondary" className="gap-1 ps-2 pe-1 text-[11px]">
          {pill.label}
          <button
            type="button"
            onClick={pill.onClear}
            aria-label={pill.label}
            className="rounded-sm p-0.5 hover:bg-background/60"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Button type="button" variant="ghost" size="sm" onClick={onClearAll} className="ms-auto h-7 px-2 text-xs">
        {t('models.filters.clearAll')}
      </Button>
    </div>
  );
}
