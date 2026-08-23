import { DataTable } from '@/components/common/data-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdaptiveModeChartProps, DataTableColumn, ModeInsight } from '@/types';

export function AdaptiveModeChart({ modeInsights, t }: AdaptiveModeChartProps): React.ReactElement {
  // Same treatment as the provider table: 418px of columns did not fit a phone
  // card, so the mode breakdown stacks on a coarse pointer.
  const columns: DataTableColumn<ModeInsight>[] = [
    {
      key: 'mode',
      header: t('adaptiveLearning.mode'),
      render: (insight) => <span className="font-medium">{insight.routingMode}</span>,
    },
    {
      key: 'count',
      header: t('adaptiveLearning.count'),
      className: 'text-end tabular-nums',
      render: (insight) => insight.count,
    },
    {
      key: 'percentage',
      header: t('adaptiveLearning.percentage'),
      className: 'text-end tabular-nums',
      render: (insight) => `${(insight.percentage * 100).toFixed(1)}%`,
    },
    {
      key: 'avgConfidence',
      header: t('adaptiveLearning.avgConfidence'),
      className: 'text-end tabular-nums',
      render: (insight) => `${(insight.avgConfidence * 100).toFixed(1)}%`,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('adaptiveLearning.modeBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <DataTable
          columns={columns}
          data={modeInsights}
          keyExtractor={(insight) => insight.routingMode}
          mobileTitleKey="mode"
        />
      </CardContent>
    </Card>
  );
}
