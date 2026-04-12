import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReplaySummaryCardProps } from '@/types';

export function ReplaySummaryCard({ result, t }: ReplaySummaryCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('replay.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('replay.totalReplayed')}</p>
            <p className="text-2xl font-bold tabular-nums">{result.totalReplayed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('replay.changed')}</p>
            <p className="text-2xl font-bold tabular-nums text-amber-600">{result.changed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('replay.unchanged')}</p>
            <p className="text-2xl font-bold tabular-nums text-emerald-600">{result.unchanged}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('replay.confidenceOld')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {(result.averageConfidenceOld * 100).toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('replay.confidenceNew')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {(result.averageConfidenceNew * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
