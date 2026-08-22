import { DataTable } from '@/components/common/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdaptiveProviderTableProps, DataTableColumn, ProviderInsight } from '@/types';

export function AdaptiveProviderTable({
  providerInsights,
  t,
}: AdaptiveProviderTableProps): React.ReactElement {
  // Five columns of provider metrics need ~545px, which forced a horizontal
  // scroller inside a 158px card on a phone. DataTable stacks them instead.
  const columns: DataTableColumn<ProviderInsight>[] = [
    {
      key: 'provider',
      header: t('adaptiveLearning.provider'),
      render: (insight) => <span className="font-medium">{insight.provider}</span>,
    },
    {
      key: 'totalCalls',
      header: t('adaptiveLearning.totalCalls'),
      className: 'text-end tabular-nums',
      render: (insight) => insight.totalDecisions,
    },
    {
      key: 'fallbackRate',
      header: t('adaptiveLearning.fallbackRate'),
      className: 'text-end tabular-nums',
      render: (insight) => `${(insight.fallbackRate * 100).toFixed(1)}%`,
    },
    {
      key: 'avgConfidence',
      header: t('adaptiveLearning.avgConfidence'),
      className: 'text-end tabular-nums',
      render: (insight) => `${(insight.avgConfidence * 100).toFixed(1)}%`,
    },
    {
      key: 'topModes',
      header: t('adaptiveLearning.topModes'),
      render: (insight) => (
        <div className="flex flex-wrap gap-1">
          {insight.topModes.map((mode) => (
            <span
              key={mode}
              className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
            >
              {mode}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('adaptiveLearning.providerTable')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={providerInsights}
          keyExtractor={(insight) => insight.provider}
          mobileTitleKey="provider"
        />
      </CardContent>
    </Card>
  );
}
