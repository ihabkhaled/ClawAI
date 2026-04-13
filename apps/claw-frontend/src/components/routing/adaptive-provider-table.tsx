import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AdaptiveProviderTableProps } from '@/types';

export function AdaptiveProviderTable({
  providerInsights,
  t,
}: AdaptiveProviderTableProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('adaptiveLearning.providerTable')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('adaptiveLearning.provider')}</TableHead>
              <TableHead className="text-right">{t('adaptiveLearning.totalCalls')}</TableHead>
              <TableHead className="text-right">{t('adaptiveLearning.fallbackRate')}</TableHead>
              <TableHead className="text-right">{t('adaptiveLearning.avgConfidence')}</TableHead>
              <TableHead>{t('adaptiveLearning.topModes')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {providerInsights.map((insight) => (
              <TableRow key={insight.provider}>
                <TableCell className="font-medium">{insight.provider}</TableCell>
                <TableCell className="text-right tabular-nums">{insight.totalDecisions}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {(insight.fallbackRate * 100).toFixed(1)}%
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {(insight.avgConfidence * 100).toFixed(1)}%
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {insight.topModes.map((mode) => (
                      <span
                        key={mode}
                        className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
