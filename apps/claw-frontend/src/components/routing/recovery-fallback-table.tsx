import { DataTable } from '@/components/common/data-table';
import type { DataTableColumn, RecoveryFallbackTableProps } from '@/types';
import type { RecentFallback } from '@/types/recovery.types';

export function RecoveryFallbackTable({
  recentFallbacks,
  t,
}: RecoveryFallbackTableProps): React.ReactElement {
  // Six columns of provider/model/mode/time needed 570px, so on a phone the
  // whole log sat in a horizontal scroller 206px wide. Stacking each fallback
  // into a card keeps every field readable without sideways scrolling.
  const columns: DataTableColumn<RecentFallback>[] = [
    {
      key: 'originalProvider',
      header: t('recovery.originalProvider'),
      render: (fallback) => fallback.selectedProvider,
    },
    {
      key: 'originalModel',
      header: t('recovery.originalModel'),
      className: 'text-muted-foreground',
      render: (fallback) => fallback.selectedModel,
    },
    {
      key: 'fallbackProvider',
      header: t('recovery.fallbackProvider'),
      render: (fallback) => fallback.fallbackProvider ?? t('common.notAvailable'),
    },
    {
      key: 'fallbackModel',
      header: t('recovery.fallbackModel'),
      className: 'text-muted-foreground',
      render: (fallback) => fallback.fallbackModel ?? t('common.notAvailable'),
    },
    {
      key: 'mode',
      header: t('recovery.mode'),
      render: (fallback) => (
        <span className="bg-muted rounded px-1.5 py-0.5 text-xs">{fallback.routingMode}</span>
      ),
    },
    {
      key: 'time',
      header: t('recovery.time'),
      className: 'text-muted-foreground',
      render: (fallback) => new Date(fallback.createdAt).toLocaleString(),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={recentFallbacks}
      keyExtractor={(fallback) => fallback.id}
      emptyMessage={t('recovery.noFallbacks')}
      mobileTitleKey="originalProvider"
    />
  );
}
