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
      <span className="inline-flex items-center gap-1 text-success">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t('compare.judgeVerified')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.REVISED) {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <RefreshCw className="h-3.5 w-3.5" />
        {t('compare.judgeRevised')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.ESCALATED) {
    return (
      <span className="inline-flex items-center gap-1 text-info">
        <ArrowUpCircle className="h-3.5 w-3.5" />
        {t('compare.judgeEscalated')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.FAILED) {
    return (
      <span className="inline-flex items-center gap-1 text-destructive">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t('compare.judgeFailed')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.UNAVAILABLE) {
    return (
      <span className="inline-flex items-center gap-1 text-warning">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t('compare.judgeUnavailable')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.SKIPPED) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <MinusCircle className="h-3.5 w-3.5" />
        {t('compare.judgeSkipped')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.AWAITING) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        {t('compare.judgeAwaiting')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Info className="h-3.5 w-3.5" />
      {t('compare.noJudge')}
    </span>
  );
}
