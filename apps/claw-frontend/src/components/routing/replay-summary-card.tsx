import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ReplaySummaryCardProps } from '@/types';

export function ReplaySummaryCard({ result, t }: ReplaySummaryCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('replay.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.totalReplayed')}</p>
            <p className="text-2xl font-bold tabular-nums">{result.totalReplayed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.changed')}</p>
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{result.changed}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.unchanged')}</p>
            <p className="text-2xl font-bold text-emerald-600 tabular-nums">{result.unchanged}</p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.suspicious')}</p>
            <p className="text-destructive text-2xl font-bold tabular-nums">
              {result.suspiciousCount}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.confidenceOld')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {(result.averageConfidenceOld * 100).toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.confidenceNew')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {(result.averageConfidenceNew * 100).toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.avgImprovement')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {result.averageImprovementScore > 0 ? '+' : ''}
              {result.averageImprovementScore.toFixed(2)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-sm">{t('replay.badRegression')}</p>
            <p className="text-destructive text-2xl font-bold tabular-nums">
              {result.labelBreakdown.badRegression}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
