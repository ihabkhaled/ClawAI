'use client';

import {
  AlertTriangle,
  ArrowUpCircle,
  Clock,
  Info,
  MinusCircle,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

import { CompareJudgeState } from '@/enums';
import type { CompareJudgeBadgesProps } from '@/types';

export function CompareJudgeBadges({
  judgeState,
  t,
}: CompareJudgeBadgesProps): React.ReactElement | null {
  if (judgeState === CompareJudgeState.VERIFIED) {
    return (
      <span className="text-success inline-flex min-w-0 items-center gap-1 break-words">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeVerified')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.REVISED) {
    return (
      <span className="text-warning inline-flex min-w-0 items-center gap-1 break-words">
        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeRevised')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.ESCALATED) {
    return (
      <span className="text-info inline-flex min-w-0 items-center gap-1 break-words">
        <ArrowUpCircle className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeEscalated')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.FAILED) {
    return (
      <span className="text-destructive inline-flex min-w-0 items-center gap-1 break-words">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeFailed')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.UNAVAILABLE) {
    return (
      <span className="text-warning inline-flex min-w-0 items-center gap-1 break-words">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeUnavailable')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.SKIPPED) {
    return (
      <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1 break-words">
        <MinusCircle className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeSkipped')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.AWAITING) {
    return (
      <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1 break-words">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {t('compare.judgeAwaiting')}
      </span>
    );
  }
  return (
    <span className="text-muted-foreground inline-flex min-w-0 items-center gap-1 break-words">
      <Info className="h-3.5 w-3.5 shrink-0" />
      {t('compare.noJudge')}
    </span>
  );
}
