import { DataTable } from '@/components/common/data-table';
import type { DataTableColumn, RecoveryProviderTableProps } from '@/types';
import type { ProviderFailureStat } from '@/types/recovery.types';

export function RecoveryProviderTable({
  providerStats,
  t,
}: RecoveryProviderTableProps): React.ReactElement {
  // 308px of columns did not fit the 206px card on a 280px viewport.
  const columns: DataTableColumn<ProviderFailureStat>[] = [
    {
      key: 'provider',
      header: t('recovery.provider'),
      render: (stat) => <span className="font-medium">{stat.provider}</span>,
    },
    {
      key: 'fallbackCount',
      header: t('recovery.fallbackCount'),
      className: 'text-end',
      render: (stat) => stat.fallbackCount,
    },
    {
      key: 'rate',
      header: t('recovery.rate'),
      className: 'text-end',
      render: (stat) => `${(stat.fallbackRate * 100).toFixed(1)}%`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={providerStats}
      keyExtractor={(stat) => stat.provider}
      emptyMessage={t('recovery.noFallbacks')}
      mobileTitleKey="provider"
    />
  );
}
