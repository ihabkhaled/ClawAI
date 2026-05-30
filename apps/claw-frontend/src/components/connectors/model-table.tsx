import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { LIFECYCLE_LABELS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { ConnectorModel, DataTableColumn, ModelTableProps } from '@/types';
import { formatContextTokens, getLifecycleBadgeVariant } from '@/utilities';

export function ModelTable({ models, showProvider = false, emptyMessage }: ModelTableProps) {
  const { t } = useTranslation();
  const columns: DataTableColumn<ConnectorModel>[] = [
    {
      key: 'displayName',
      header: t('models.colModel'),
      render: (model) => (
        <div>
          <span className="font-medium">{model.displayName}</span>
          <p className="text-xs text-muted-foreground">{model.modelKey}</p>
        </div>
      ),
    },
  ];

  if (showProvider) {
    columns.push({
      key: 'provider',
      header: t('connectors.provider'),
      render: (model) => (
        <span className="text-sm">{PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider}</span>
      ),
    });
  }

  columns.push(
    {
      key: 'lifecycle',
      header: t('models.lifecycle'),
      render: (model) => (
        <Badge variant={getLifecycleBadgeVariant(model.lifecycle)}>
          {LIFECYCLE_LABELS[model.lifecycle] ?? model.lifecycle}
        </Badge>
      ),
    },
    {
      key: 'capabilities',
      header: t('models.capabilities.label'),
      render: (model) => (
        <div className="flex flex-wrap gap-1">
          {model.supportsStreaming ? (
            <Badge variant="outline" className="text-xs">
              {t('models.streaming')}
            </Badge>
          ) : null}
          {model.supportsTools ? (
            <Badge variant="outline" className="text-xs">
              {t('models.tools')}
            </Badge>
          ) : null}
          {model.supportsVision ? (
            <Badge variant="outline" className="text-xs">
              {t('models.vision')}
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'context',
      header: t('models.context'),
      className: 'text-end',
      render: (model) => (
        <span className="text-sm text-muted-foreground">
          {formatContextTokens(model.maxContextTokens)}
        </span>
      ),
    },
  );

  return (
    <DataTable
      columns={columns}
      data={models}
      keyExtractor={(model) => model.id}
      emptyMessage={emptyMessage ?? t('models.noSyncedModels')}
    />
  );
}
