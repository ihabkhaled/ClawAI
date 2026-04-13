import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdaptiveModeChartProps } from '@/types';

export function AdaptiveModeChart({ modeInsights, t }: AdaptiveModeChartProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('adaptiveLearning.modeBreakdown')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adaptiveLearning.mode')}</TableHead>
              <TableHead className="text-right">{t('adaptiveLearning.count')}</TableHead>
              <TableHead className="text-right">{t('adaptiveLearning.percentage')}</TableHead>
              <TableHead className="text-right">{t('adaptiveLearning.avgConfidence')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {modeInsights.map((insight) => (
              <TableRow key={insight.routingMode}>
                <TableCell className="font-medium">{insight.routingMode}</TableCell>
                <TableCell className="text-right tabular-nums">{insight.count}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {(insight.percentage * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(insight.avgConfidence * 100).toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
