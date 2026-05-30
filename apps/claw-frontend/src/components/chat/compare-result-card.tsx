'use client';

import {
  Check,
  CheckCircle,
  Clock,
  Code,
  Copy,
  Download,
  FileText,
  Maximize2,
  Trophy,
  XCircle,
  Zap,
} from 'lucide-react';

import { CompareJudgeBadges } from '@/components/chat/compare-judge-badges';
import { JudgeRefereeDetails } from '@/components/chat/judge-referee-details';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CompareJudgeState, CompareResultViewMode, ParallelModelStatus } from '@/enums';
import { useCompareResultCard } from '@/hooks/chat/use-compare-result-card';
import { MarkdownRenderer } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { CompareResultCardProps } from '@/types';
import { formatLatency } from '@/utilities';

export function CompareResultCard({
  response,
  isFastest,
  isBest,
  t,
}: CompareResultCardProps): React.ReactElement {
  const { viewMode, expanded, copied, toggleViewMode, setExpanded, copyContent, exportMarkdown } =
    useCompareResultCard(response, t);

  const isCompleted = response.status === ParallelModelStatus.COMPLETED;
  const isFailed = response.status === ParallelModelStatus.FAILED;
  const isTimeout = response.status === ParallelModelStatus.TIMEOUT;
  const totalTokens = (response.inputTokens ?? 0) + (response.outputTokens ?? 0);
  const judgeState = response.judgeState ?? CompareJudgeState.NONE;
  const hasContent = !isFailed && response.content.length > 0;
  const judgeMessage = response.message;
  const hasJudgeDetails =
    response.judgeReview?.judgeDialogAvailable === true && judgeMessage !== undefined;
  const isMarkdown = viewMode === CompareResultViewMode.MARKDOWN;

  return (
    <Card
      className={cn(
        'flex flex-col',
        isFastest && 'border-green-500/40',
        isBest && 'border-amber-500/40',
        isFailed && 'border-destructive/30',
        isTimeout && 'border-yellow-500/30',
      )}
    >
      <CardHeader className="shrink-0 pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{response.model}</p>
            <Badge variant="outline" className="mt-1 text-xs">
              {response.provider}
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
              {t('compare.latency')}: {formatLatency(response.latencyMs)}
            </span>
          ) : null}
          {isFailed ? <span className="text-destructive">{t('compare.failed')}</span> : null}
          {isTimeout ? <span className="text-yellow-600">{t('compare.timeout')}</span> : null}
          {totalTokens > 0 ? (
            <span>
              {t('compare.tokens')}: {totalTokens.toLocaleString()}
            </span>
          ) : null}
          <CompareJudgeBadges judgeState={judgeState} t={t} />
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {isFailed && response.errorMessage ? (
          <p className="text-sm text-destructive">{response.errorMessage}</p>
        ) : null}
        {!isFailed && response.content.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">{t('compare.noContent')}</p>
        ) : null}
        {hasContent ? (
          <div className="max-h-96 overflow-y-auto">
            {isMarkdown ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={response.content} />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-sm">{response.content}</pre>
            )}
          </div>
        ) : null}
        {hasJudgeDetails && judgeMessage ? (
          <div className="mt-4 border-t border-border/60 pt-3">
            <JudgeRefereeDetails message={judgeMessage} />
          </div>
        ) : null}
      </CardContent>

      {hasContent ? (
        <CardFooter className="shrink-0 flex-wrap gap-1.5 pt-2">
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={toggleViewMode}>
            {isMarkdown ? <Code className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />}
            {isMarkdown ? t('compare.viewRaw') : t('compare.viewMarkdown')}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={copyContent}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t('compare.copied') : t('compare.copy')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={exportMarkdown}
          >
            <Download className="h-3.5 w-3.5" />
            {t('compare.exportMd')}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setExpanded(true)}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            {t('compare.expand')}
          </Button>
        </CardFooter>
      ) : null}

      <Dialog open={expanded} onOpenChange={setExpanded}>
        {/* DialogContent ships with flex flex-col + max-h-[90vh] + overflow-hidden
            defaults; body needs min-h-0 + flex-1 + overflow-y-auto to scroll. */}
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <span>{response.model}</span>
              <Badge variant="outline" className="text-xs">
                {response.provider}
              </Badge>
              <span className="text-sm font-normal text-muted-foreground">
                {t('compare.fullOutput')}
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {isMarkdown ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={response.content} />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap break-words text-sm">{response.content}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
