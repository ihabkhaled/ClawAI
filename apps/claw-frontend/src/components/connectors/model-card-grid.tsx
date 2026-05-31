// Grid layout for the model card view. Renders one `ModelCard` per row; the
// grid breakpoints (sm: 2 cols, lg: 3 cols, xl: 4 cols) mirror the connector
// list page so the two cross-provider lists feel visually consistent.
import { ModelCard } from '@/components/connectors/model-card';
import { useTranslation } from '@/lib/i18n';
import type { ModelCardGridProps } from '@/types';

export function ModelCardGrid({
  models,
  emptyMessage,
  compareSelection,
  onToggleCompare,
}: ModelCardGridProps): React.ReactElement {
  const { t } = useTranslation();

  if (models.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        {emptyMessage ?? t('models.noModelsMatch')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {models.map((model) => (
        <ModelCard
          key={model.id}
          model={model}
          selected={compareSelection?.has(model.id)}
          onToggleSelect={onToggleCompare}
        />
      ))}
    </div>
  );
}
