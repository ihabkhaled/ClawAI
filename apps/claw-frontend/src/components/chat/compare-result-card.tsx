'use client';

import { CheckCircle, Clock, Trophy, XCircle, Zap } from 'lucide-react';

import { AttachmentDeliveryChip } from '@/components/chat/attachments/attachment-delivery-chip';
import { CompareJudgeBadges } from '@/components/chat/compare-judge-badges';
import { CompareResultActions } from '@/components/chat/compare-result-actions';
import { JudgeRefereeDetails } from '@/components/chat/judge-referee-details';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
        isFastest && 'border-success/40',
        isBest && 'border-warning/40',
        isFailed && 'border-destructive/30',
        isTimeout && 'border-warning/30',
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
              <Badge className="bg-success/10 text-success gap-1 text-xs">
                <Zap className="h-3 w-3" />
                {t('compare.fastest')}
              </Badge>
            ) : null}
            {isBest ? (
              <Badge className="bg-warning/10 text-warning gap-1 text-xs">
                <Trophy className="h-3 w-3" />
                {t('compare.bestResponse')}
              </Badge>
            ) : null}
            {isCompleted ? <CheckCircle className="text-success h-4 w-4" /> : null}
            {isFailed ? <XCircle className="text-destructive h-4 w-4" /> : null}
            {isTimeout ? <Clock className="text-warning h-4 w-4" /> : null}
          </div>
        </div>

        <div className="text-muted-foreground mt-1 flex flex-wrap gap-2 text-xs">
          {isCompleted ? (
            <span>
              {t('compare.latency')}: {formatLatency(response.latencyMs)}
            </span>
          ) : null}
          {isFailed ? <span className="text-destructive">{t('compare.failed')}</span> : null}
          {isTimeout ? <span className="text-warning">{t('compare.timeout')}</span> : null}
          {totalTokens > 0 ? (
            <span>
              {t('compare.tokens')}: {totalTokens.toLocaleString()}
            </span>
          ) : null}
          <CompareJudgeBadges judgeState={judgeState} t={t} />
          {response.attachmentDelivery && response.attachmentDelivery.length > 0 ? (
            <AttachmentDeliveryChip delivery={response.attachmentDelivery} />
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        {isFailed && response.errorMessage ? (
          <p className="text-destructive text-sm">{response.errorMessage}</p>
        ) : null}
        {!isFailed && response.content.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">{t('compare.noContent')}</p>
        ) : null}
        {/* Same actions as the footer, repeated ABOVE the output. With two
         * panels side by side the response body scrolls independently, so the
         * footer controls can sit a long way from where the user is reading —
         * expand in particular needs to be reachable without scrolling first. */}
        {hasContent ? (
          <CompareResultActions
            isMarkdown={isMarkdown}
            copied={copied}
            onToggleViewMode={toggleViewMode}
            onCopy={copyContent}
            onExport={exportMarkdown}
            onExpand={() => setExpanded(true)}
            className="border-border/60 mb-2 border-b pb-2"
            t={t}
          />
        ) : null}
        {hasContent ? (
          <div className="max-h-96 overflow-y-auto">
            {isMarkdown ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <MarkdownRenderer content={response.content} />
              </div>
            ) : (
              <pre className="text-sm break-words whitespace-pre-wrap">{response.content}</pre>
            )}
          </div>
        ) : null}
        {hasJudgeDetails && judgeMessage ? (
          <div className="border-border/60 mt-4 border-t pt-3">
            <JudgeRefereeDetails message={judgeMessage} />
          </div>
        ) : null}
      </CardContent>

      {hasContent ? (
        <CardFooter className="shrink-0 pt-2">
          <CompareResultActions
            isMarkdown={isMarkdown}
            copied={copied}
            onToggleViewMode={toggleViewMode}
            onCopy={copyContent}
            onExport={exportMarkdown}
            onExpand={() => setExpanded(true)}
            t={t}
          />
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
              <span className="text-muted-foreground text-sm font-normal">
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
              <pre className="text-sm break-words whitespace-pre-wrap">{response.content}</pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
