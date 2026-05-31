// Sticky bar rendered above the model list when "Compare Mode" is on.
// Displays the running selected-count, the model labels themselves (truncated
// after three names), a "Clear selection" affordance, and the primary
// "Compare {count}" CTA which is disabled until the user has picked at least
// two models. The toolbar is purely presentational — the parent page wires
// the actual navigation/comparison.
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
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm">
        <Scale className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="font-medium">{t('models.compare.selectedCount', { count: selectedCount })}</span>
        {selectedLabels.length > 0 ? (
          <span className="hidden truncate text-xs text-muted-foreground sm:inline">
            {previewLabels}
            {overflow}
          </span>
        ) : null}
      </div>
      <div className="ms-auto flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClear} disabled={selectedCount === 0}>
          <X className="me-1 h-4 w-4" />
          {t('models.compare.clear')}
        </Button>
        <Button type="button" size="sm" onClick={onCompare} disabled={!canCompare}>
          {t('models.compare.compareCta', { count: selectedCount })}
        </Button>
      </div>
      {!canCompare && selectedCount < 2 ? (
        <span className="basis-full text-xs text-muted-foreground">
          {t('models.compare.compareMinHint')}
        </span>
      ) : null}
    </div>
  );
}
