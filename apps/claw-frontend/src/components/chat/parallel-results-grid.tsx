'use client';

import { CheckCircle, ChevronDown, ChevronUp, Clock, Trophy, XCircle, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PARALLEL_CONTENT_PREVIEW_LENGTH } from '@/constants';
import { ParallelModelStatus } from '@/enums';
import { useParallelResultsGrid } from '@/hooks/chat/use-parallel-results-grid';
import { MarkdownRenderer } from '@/lib/markdown';
import type { ParallelResultsGridProps } from '@/types';
import { cn, formatLatency, getParallelColClass } from '@/utilities';

export function ParallelResultsGrid({ messages, t }: ParallelResultsGridProps): React.ReactElement {
  const { responses, fastestModel, bestModel, expandedIds, toggleExpanded } =
    useParallelResultsGrid(messages);

  if (messages.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">{t('compare.noResults')}</p>
    );
  }

  const colClass = getParallelColClass(messages.length);

  return (
    <div className={`grid gap-4 ${colClass}`}>
      {responses.map((r) => {
        const isCompleted = r.status === ParallelModelStatus.COMPLETED;
        const isFailed = r.status === ParallelModelStatus.FAILED;
        const isTimeout = r.status === ParallelModelStatus.TIMEOUT;
        const isFastest = isCompleted && r.model === fastestModel;
        const isBest = isCompleted && r.model === bestModel && bestModel !== fastestModel;
        const isExpanded = expandedIds.has(r.model);
        const needsTruncation = r.content.length > PARALLEL_CONTENT_PREVIEW_LENGTH;
        const totalTokens = (r.inputTokens ?? 0) + (r.outputTokens ?? 0);

        return (
          <Card
            key={`${r.provider}:${r.model}`}
            className={cn(
              'flex flex-col',
              isFastest && 'border-green-500/40',
              isBest && 'border-amber-500/40',
              isFailed && 'border-destructive/30',
              isTimeout && 'border-yellow-500/30',
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.model}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {r.provider}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  {isFastest ? (
                    <Badge className="gap-1 bg-green-500/10 text-xs text-green-600">
                      <Zap className="h-3 w-3" />
                      {t('compare.fastest')}
                    </Badge>
                  ) : null}
                  {isBest ? (
                    <Badge className="gap-1 bg-amber-500/10 text-xs text-amber-600">
                      <Trophy className="h-3 w-3" />
                      {t('compare.bestResponse')}
                    </Badge>
                  ) : null}
                  {isCompleted ? <CheckCircle className="h-4 w-4 text-green-500" /> : null}
                  {isFailed ? <XCircle className="h-4 w-4 text-destructive" /> : null}
                  {isTimeout ? <Clock className="h-4 w-4 text-yellow-500" /> : null}
                </div>
              </div>

              <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {isCompleted ? (
                  <span>
                    {t('compare.latency')}: {formatLatency(r.latencyMs)}
                  </span>
                ) : null}
                {isFailed ? <span className="text-destructive">{t('compare.failed')}</span> : null}
                {isTimeout ? <span className="text-yellow-600">{t('compare.timeout')}</span> : null}
                {totalTokens > 0 ? (
                  <span>
                    {t('compare.tokens')}: {totalTokens.toLocaleString()}
                  </span>
                ) : null}
              </div>
            </CardHeader>

            <CardContent className="flex-1">
              {isFailed && r.errorMessage ? (
                <p className="text-sm text-destructive">{r.errorMessage}</p>
              ) : null}
              {!isFailed && r.content.length === 0 ? (
                <p className="text-sm italic text-muted-foreground">{t('compare.noContent')}</p>
              ) : null}
              {!isFailed && r.content.length > 0 ? (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {isExpanded || !needsTruncation ? (
                    <MarkdownRenderer content={r.content} />
                  ) : (
                    <p className="text-sm text-foreground">
                      {r.content.slice(0, PARALLEL_CONTENT_PREVIEW_LENGTH)}...
                    </p>
                  )}
                </div>
              ) : null}
              {needsTruncation ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 h-7 px-2 text-xs"
                  onClick={() => toggleExpanded(r.model)}
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="me-1 h-3 w-3" />
                      {t('compare.showLess')}
                    </>
                  ) : (
                    <>
                      <ChevronDown className="me-1 h-3 w-3" />
                      {t('compare.showMore')}
                    </>
                  )}
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
