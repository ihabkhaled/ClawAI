import { DataTable } from '@/components/common/data-table';
import { Badge } from '@/components/ui/badge';
import { LIFECYCLE_LABELS, PROVIDER_DISPLAY_NAMES } from '@/constants';
import type { ConnectorModel, DataTableColumn, ModelTableProps } from '@/types';
import { formatContextTokens, getLifecycleBadgeVariant } from '@/utilities';

export function ModelTable({
  models,
  showProvider = false,
  emptyMessage = 'No models synced yet.',
}: ModelTableProps) {
  const columns: DataTableColumn<ConnectorModel>[] = [
    {
      key: 'displayName',
      header: 'Model',
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
      header: 'Provider',
      render: (model) => (
        <span className="text-sm">{PROVIDER_DISPLAY_NAMES[model.provider] ?? model.provider}</span>
      ),
    });
  }

  columns.push(
    {
      key: 'lifecycle',
      header: 'Lifecycle',
      render: (model) => (
        <Badge variant={getLifecycleBadgeVariant(model.lifecycle)}>
          {LIFECYCLE_LABELS[model.lifecycle] ?? model.lifecycle}
        </Badge>
      ),
    },
    {
      key: 'capabilities',
      header: 'Capabilities',
      render: (model) => (
        <div className="flex flex-wrap gap-1">
          {model.supportsStreaming ? (
            <Badge variant="outline" className="text-xs">
              Streaming
            </Badge>
          ) : null}
          {model.supportsTools ? (
            <Badge variant="outline" className="text-xs">
              Tools
            </Badge>
          ) : null}
          {model.supportsVision ? (
            <Badge variant="outline" className="text-xs">
              Vision
            </Badge>
          ) : null}
        </div>
      ),
    },
    {
      key: 'context',
      header: 'Context',
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
      emptyMessage={emptyMessage}
    />
  );
}
