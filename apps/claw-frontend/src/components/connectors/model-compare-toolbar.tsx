import { Scale, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';
import type { ModelCompareToolbarProps } from '@/types';

export function ModelCompareToolbar({
  selectedCount,
  selectedLabels,
  onClear,
  onCompare,
  canCompare,
}: ModelCompareToolbarProps): React.ReactElement {
  const { t } = useTranslation();
  const previewLabels = selectedLabels.slice(0, 3).join(', ');
  const overflow = selectedLabels.length > 3 ? ` +${selectedLabels.length - 3}` : '';

  return (
    <div className="sticky top-[var(--topbar-height)] z-20 flex flex-col gap-3 rounded-md border bg-card p-3 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex min-w-0 items-center gap-2 text-sm">
        <Scale className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="shrink-0 font-medium">{t('models.compare.selectedCount', { count: selectedCount })}</span>
        {selectedLabels.length > 0 ? (
          <span className="min-w-0 truncate text-xs text-muted-foreground">
            {previewLabels}{overflow}
          </span>
        ) : null}
      </div>
      <div className="flex w-full items-center gap-2 sm:ms-auto sm:w-auto">
        <Button type="button" variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={onClear} disabled={selectedCount === 0}>
          <X className="me-1 h-4 w-4" />
          {t('models.compare.clear')}
        </Button>
        <Button type="button" size="sm" className="flex-1 sm:flex-none" onClick={onCompare} disabled={!canCompare}>
          {t('models.compare.compareCta', { count: selectedCount })}
        </Button>
      </div>
      {!canCompare && selectedCount < 2 ? (
        <span className="text-xs text-muted-foreground sm:basis-full">{t('models.compare.compareMinHint')}</span>
      ) : null}
    </div>
  );
}
