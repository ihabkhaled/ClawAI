'use client';

import { ArrowUpCircle, ClipboardList, RefreshCw, ShieldCheck } from 'lucide-react';

import { JudgeReviewCriticSection } from '@/components/chat/judge-review-critic-section';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { JudgeReviewDecision } from '@/enums';
import { useJudgeReview } from '@/hooks/chat/use-judge-review';
import { useTranslation } from '@/lib/i18n';
import { MarkdownRenderer } from '@/lib/markdown';
import { cn } from '@/lib/utils';
import type { JudgeRefereeDetailsProps } from '@/types';
import {
  formatLatency,
  getJudgeDecisionLabel,
  getJudgeDecisionTone,
  getJudgeResponseTypeLabel,
} from '@/utilities';

function DecisionIcon({ decision }: { decision: JudgeReviewDecision }): React.ReactElement {
  if (decision === JudgeReviewDecision.ESCALATE) {
    return <ArrowUpCircle className="h-3.5 w-3.5" />;
  }

  if (decision === JudgeReviewDecision.REVISE) {
    return <RefreshCw className="h-3.5 w-3.5" />;
  }

  return <ShieldCheck className="h-3.5 w-3.5" />;
}

function ReviewSection({
  title,
  content,
}: {
  title: string;
  content: string | null;
}): React.ReactElement | null {
  if (!content) {
    return null;
  }

  return (
    <section className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4">
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <div className="max-h-80 overflow-y-auto text-sm text-foreground">
        <MarkdownRenderer content={content} />
      </div>
    </section>
  );
}

export function JudgeRefereeDetails({
  message,
}: JudgeRefereeDetailsProps): React.ReactElement | null {
  const { t } = useTranslation();
  const { isOpen, judgeReview, hasJudgeReview, openJudgeReview, closeJudgeReview } =
    useJudgeReview(message);

  if (!judgeReview || !hasJudgeReview) {
    return null;
  }

  const decisionLabel = getJudgeDecisionLabel(judgeReview.judgeDecision, t);
  const responseTypeLabel = getJudgeResponseTypeLabel(judgeReview.judgeResponseType, t);
  const decisionTone = getJudgeDecisionTone(judgeReview.judgeDecision);

  return (
    <>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
        <Badge variant="outline" className={cn('gap-1', decisionTone)}>
          <DecisionIcon decision={judgeReview.judgeDecision} />
          {decisionLabel}
        </Badge>
        <span className="text-muted-foreground">{judgeReview.judgeSummary}</span>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={openJudgeReview}>
          <ClipboardList className="me-1 h-3.5 w-3.5" />
          {t('chat.judgeOpenReview')}
        </Button>
      </div>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => (open ? openJudgeReview() : closeJudgeReview())}
      >
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn('gap-1', decisionTone)}>
                <DecisionIcon decision={judgeReview.judgeDecision} />
                {decisionLabel}
              </Badge>
              <span>{t('chat.judgeReviewTitle')}</span>
            </DialogTitle>
            <DialogDescription>{t('chat.judgeReviewDescription')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <section className="grid gap-3 rounded-lg border border-border/60 bg-muted/30 p-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('chat.judgeExecutionModel')}
                </p>
                <p className="text-sm text-foreground">
                  {judgeReview.originalExecutionDisplayName}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('chat.judgeJudgeModel')}
                </p>
                <p className="text-sm text-foreground">{judgeReview.judgeDisplayName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('chat.judgeDecisionLabel')}
                </p>
                <p className="text-sm text-foreground">{decisionLabel}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('chat.judgeConfidenceLabel')}
                </p>
                <p className="text-sm text-foreground">
                  {String(Math.round(judgeReview.judgeConfidence * 100))}%
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('chat.judgeJudgeLatency')}
                </p>
                <p className="text-sm text-foreground">
                  {formatLatency(judgeReview.judgeLatencyMs)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">
                  {t('chat.judgeTotalLatency')}
                </p>
                <p className="text-sm text-foreground">
                  {formatLatency(judgeReview.judgeTotalLatencyMs)}
                </p>
              </div>
            </section>

            <ReviewSection title={t('chat.judgeSummary')} content={judgeReview.judgeSummary} />
            <ReviewSection title={t('chat.judgeReasoning')} content={judgeReview.judgeReasoning} />

            <section className="space-y-2 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground">{t('chat.judgeResponse')}</h3>
                <Badge variant="secondary" className="text-[10px]">
                  {responseTypeLabel}
                </Badge>
              </div>
              <div className="max-h-80 overflow-y-auto text-sm text-foreground">
                <MarkdownRenderer content={judgeReview.judgeResponse} />
              </div>
            </section>

            <ReviewSection
              title={t('chat.judgeOriginalAnswer')}
              content={judgeReview.originalAnswerSnapshot}
            />
            <ReviewSection
              title={t('chat.judgeRevisedAnswer')}
              content={judgeReview.revisedAnswer}
            />
            <ReviewSection
              title={t('chat.judgeEscalatedAnswer')}
              content={judgeReview.escalatedAnswer}
            />

            <section className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('chat.judgeCriticModel')}
                  </p>
                  <p className="text-sm text-foreground">
                    {judgeReview.criticDisplayName || judgeReview.criticModel}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {t('chat.judgeCriticScore')}
                  </p>
                  <p className="text-sm text-foreground">
                    {String(Math.round(judgeReview.criticScore * 100))}%
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-foreground">
                  {t('judgeReview.criticHeader')}
                </h3>
                <JudgeReviewCriticSection
                  criticRequested={judgeReview.criticRequested}
                  criticParseFailed={judgeReview.criticParseFailed}
                  criticFeedback={judgeReview.criticFeedback}
                  criticSummary={judgeReview.criticSummary}
                  t={t}
                />
              </div>

              {judgeReview.judgeMetadata.recommendedChanges.length > 0 ? (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">
                    {t('chat.judgeRecommendedChanges')}
                  </h3>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {judgeReview.judgeMetadata.recommendedChanges.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
