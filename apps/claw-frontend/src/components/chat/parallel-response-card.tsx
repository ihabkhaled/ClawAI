import { CheckCircle, XCircle, Zap } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MarkdownRenderer } from '@/lib/markdown';
import type { ParallelResponseCardProps } from '@/types';
import { formatLatency } from '@/utilities';

export function ParallelResponseCard({ response, isFastest, t }: ParallelResponseCardProps) {
  const isCompleted = response.status === 'completed';
  const isFailed = response.status === 'failed';

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-sm">{response.model}</CardTitle>
            <Badge variant="outline" className="mt-1 text-xs">
              {response.provider}
            </Badge>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {isFastest && isCompleted ? (
              <Badge variant="default" className="gap-1 text-xs">
                <Zap className="h-3 w-3" />
                {t('compare.fastest')}
              </Badge>
            ) : null}
            {isCompleted ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : null}
            {isFailed ? (
              <XCircle className="h-4 w-4 text-destructive" />
            ) : null}
          </div>
        </div>

        <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span>
            {t('compare.latency')}: {formatLatency(response.latencyMs)}
          </span>
          {response.inputTokens !== null ? (
            <span>
              {t('compare.tokens')}: {response.inputTokens.toLocaleString()}/{(response.outputTokens ?? 0).toLocaleString()}
            </span>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {isFailed && response.errorMessage ? (
          <p className="text-sm text-destructive">{response.errorMessage}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={response.content} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
