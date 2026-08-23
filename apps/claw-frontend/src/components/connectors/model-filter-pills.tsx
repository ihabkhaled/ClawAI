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
    <div className="bg-muted/30 flex flex-wrap items-center gap-2 rounded-md border p-2">
      <Badge variant="default" className="touch:text-xs text-[11px]">
        {t('models.filters.activeCount', { count: pills.length })}
      </Badge>
      {pills.map((pill) => (
        <Badge
          key={pill.id}
          variant="secondary"
          className="touch:text-xs gap-1 ps-2 pe-1 text-[11px]"
        >
          {pill.label}
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={pill.onClear}
            aria-label={pill.label}
            className="hover:bg-background/60 rounded-sm p-0.5"
          >
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClearAll}
        className="ms-auto h-7 px-2 text-xs"
      >
        {t('models.filters.clearAll')}
      </Button>
    </div>
  );
}
