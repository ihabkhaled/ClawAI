import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AdaptiveStatsCardProps } from '@/types';

export function AdaptiveStatsCard({ insights, t }: AdaptiveStatsCardProps): React.ReactElement {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t('adaptiveLearning.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('adaptiveLearning.totalDecisions')}</p>
            <p className="text-2xl font-bold tabular-nums">{insights.totalDecisions}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('adaptiveLearning.avgConfidence')}</p>
            <p className="text-2xl font-bold tabular-nums">
              {(insights.avgConfidence * 100).toFixed(1)}%
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{t('adaptiveLearning.topReasonTags')}</p>
            <div className="flex flex-wrap gap-1 pt-1">
              {insights.topReasonTags.map((tag) => (
                <span
                  key={tag}
                  className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
