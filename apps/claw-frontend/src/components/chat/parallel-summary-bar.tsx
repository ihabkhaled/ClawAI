'use client';

import { BarChart3, CheckCircle, Clock, Trophy, XCircle, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useParallelSummaryBar } from '@/hooks/chat/use-parallel-summary-bar';
import type { ParallelSummaryBarProps } from '@/types';
import { formatLatency } from '@/utilities';

export function ParallelSummaryBar({ messages, t }: ParallelSummaryBarProps): React.ReactElement {
  const {
    completedCount,
    failedCount,
    timeoutCount,
    fastestModel,
    bestModel,
    avgLatencyMs,
    totalTokens,
  } = useParallelSummaryBar(messages);

  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-4 py-3">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{t('compare.summaryTitle')}</span>
        </div>

        <Badge variant="secondary" className="gap-1">
          {t('compare.modelsCompared')}: {messages.length}
        </Badge>

        {completedCount > 0 ? (
          <Badge variant="outline" className="gap-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            {t('compare.completedCount', { count: completedCount })}
          </Badge>
        ) : null}

        {failedCount > 0 ? (
          <Badge variant="outline" className="gap-1 text-destructive">
            <XCircle className="h-3 w-3" />
            {t('compare.failedCount', { count: failedCount })}
          </Badge>
        ) : null}

        {timeoutCount > 0 ? (
          <Badge variant="outline" className="gap-1 text-yellow-600">
            <Clock className="h-3 w-3" />
            {t('compare.timeoutCount', { count: timeoutCount })}
          </Badge>
        ) : null}

        {fastestModel ? (
          <div className="flex items-center gap-1 text-sm">
            <Zap className="h-3.5 w-3.5 text-green-500" />
            <span className="text-muted-foreground">{t('compare.fastest')}:</span>
            <span className="font-medium">{fastestModel}</span>
          </div>
        ) : null}

        {bestModel && bestModel !== fastestModel ? (
          <div className="flex items-center gap-1 text-sm">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-muted-foreground">{t('compare.bestResponse')}:</span>
            <span className="font-medium">{bestModel}</span>
          </div>
        ) : null}

        {avgLatencyMs > 0 ? (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t('compare.avgLatencyLabel')}: {formatLatency(avgLatencyMs)}
          </div>
        ) : null}

        {totalTokens > 0 ? (
          <div className="text-sm text-muted-foreground">
            {t('compare.totalTokens')}: {totalTokens.toLocaleString()}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
