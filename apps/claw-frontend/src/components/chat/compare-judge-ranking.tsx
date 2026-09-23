'use client';

import { AlertTriangle, Scale, Trophy } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { useCompareJudgeRanking } from '@/hooks/chat/use-compare-judge-ranking';
import type { CompareJudgeRankingProps } from '@/types';

/**
 * The comparative judge's verdict for a whole Compare run (ADR-114): one
 * ranking, one shared scale, one rationale. Replaces reading a winner off
 * per-lane scores that were never on the same scale.
 */
export function CompareJudgeRanking({
  verdict,
  t,
}: CompareJudgeRankingProps): React.ReactElement {
  const { rows, hasRanking, isTie, noticeKey } = useCompareJudgeRanking(verdict);
  const max = verdict.scale.max;

  return (
    <section
      aria-label={t('compare.ranking.title')}
      className="border-border/60 bg-muted/30 space-y-3 rounded-lg border p-3 sm:p-4"
      data-testid="compare-judge-ranking"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3 className="flex min-w-0 items-center gap-1.5 text-sm font-semibold">
          <Scale className="h-4 w-4 shrink-0" aria-hidden="true" />
          {t('compare.ranking.title')}
        </h3>
        {verdict.judgeModel.length > 0 ? (
          <span className="text-muted-foreground min-w-0 text-xs break-all">
            {t('compare.ranking.judgedBy', { model: verdict.judgeModel })}
          </span>
        ) : null}
      </div>

      {noticeKey === null ? null : (
        <p role="status" className="text-warning flex items-start gap-1.5 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words">{t(noticeKey)}</span>
        </p>
      )}

      {hasRanking ? (
        <>
          <p className="text-muted-foreground text-xs">{t('compare.ranking.method', { max })}</p>
          {isTie ? (
            <p role="status" className="text-sm font-medium">
              {t('compare.ranking.tie')}
            </p>
          ) : null}
          <ol className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.laneIndex}
                className="border-border/60 bg-background rounded-md border p-2.5"
                data-testid="compare-judge-ranking-row"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="bg-muted inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-semibold">
                    {t('compare.ranking.rank', { rank: row.rank })}
                  </span>
                  <span
                    className="border-border rounded border px-1.5 font-mono text-xs"
                    title={t('compare.ranking.candidateLabel', { label: row.label })}
                  >
                    {row.label}
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">{row.model}</span>
                  <Badge variant="outline" className="text-xs">
                    {row.provider}
                  </Badge>
                  {row.isWinner ? (
                    <Badge className="bg-warning/10 text-warning gap-1 text-xs">
                      <Trophy className="h-3 w-3" aria-hidden="true" />
                      {t('compare.ranking.winner')}
                    </Badge>
                  ) : null}
                  <span className="ms-auto text-sm font-semibold tabular-nums">
                    {t('compare.ranking.score', { score: row.score, max })}
                  </span>
                </div>
                <div className="bg-muted mt-2 h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{ width: `${String(row.scorePercent)}%` }}
                  />
                </div>
                {row.reason.length > 0 ? (
                  <p className="text-muted-foreground mt-1.5 text-xs break-words">{row.reason}</p>
                ) : null}
                {row.criticSummary === null ? null : (
                  <p className="text-muted-foreground mt-1 text-xs break-words">
                    {t('compare.ranking.critic', { summary: row.criticSummary })}
                  </p>
                )}
                {row.truncated ? (
                  <p className="text-warning mt-1 text-xs">{t('compare.ranking.answerTruncated')}</p>
                ) : null}
              </li>
            ))}
          </ol>
          {verdict.rationale === null ? null : (
            <div className="space-y-0.5">
              <p className="text-xs font-medium">{t('compare.ranking.rationale')}</p>
              <p className="text-sm break-words">{verdict.rationale}</p>
            </div>
          )}
          {verdict.truncated ? (
            <p className="text-muted-foreground text-xs">{t('compare.ranking.truncatedNotice')}</p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
