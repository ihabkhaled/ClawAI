// Two-state segmented toggle for the Models page: TABLE (dense data grid)
// vs GRID (card layout). The selected mode is persisted to localStorage by
// the parent hook so the user's preference survives reloads.
import { LayoutGrid, List } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ModelCatalogViewMode } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ModelViewToggleProps } from '@/types';

export function ModelViewToggle({ value, onChange }: ModelViewToggleProps): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5" role="group" aria-label={t('models.view.label')}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={value === ModelCatalogViewMode.TABLE}
        onClick={() => onChange(ModelCatalogViewMode.TABLE)}
        className={cn(
          'h-8 gap-1.5 px-2.5',
          value === ModelCatalogViewMode.TABLE && 'bg-accent text-accent-foreground',
        )}
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">{t('models.view.table')}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        aria-pressed={value === ModelCatalogViewMode.GRID}
        onClick={() => onChange(ModelCatalogViewMode.GRID)}
        className={cn(
          'h-8 gap-1.5 px-2.5',
          value === ModelCatalogViewMode.GRID && 'bg-accent text-accent-foreground',
        )}
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">{t('models.view.grid')}</span>
      </Button>
    </div>
  );
}
