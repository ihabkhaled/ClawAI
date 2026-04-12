import { CheckCircle, Clock, XCircle, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ParallelSummaryBarProps } from '@/types';
import { formatLatency } from '@/utilities';

export function ParallelSummaryBar({
  totalLatencyMs,
  completedCount,
  failedCount,
  fastestModel,
  t,
}: ParallelSummaryBarProps) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-3">
        <div className="flex items-center gap-1.5 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{t('compare.latency')}:</span>
          <span className="font-medium">{formatLatency(totalLatencyMs)}</span>
        </div>

        <div className="flex items-center gap-1.5 text-sm">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="text-muted-foreground">{t('compare.completed')}:</span>
          <span className="font-medium">{completedCount}</span>
        </div>

        {failedCount > 0 ? (
          <div className="flex items-center gap-1.5 text-sm">
            <XCircle className="h-4 w-4 text-destructive" />
            <span className="text-muted-foreground">{t('compare.failed')}:</span>
            <span className="font-medium">{failedCount}</span>
          </div>
        ) : null}

        {fastestModel ? (
          <div className="flex items-center gap-1.5 text-sm">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-muted-foreground">{t('compare.fastest')}:</span>
            <Badge variant="secondary" className="text-xs">
              {fastestModel}
            </Badge>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
