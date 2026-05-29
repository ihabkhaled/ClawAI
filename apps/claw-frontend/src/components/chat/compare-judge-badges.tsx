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
      <span className="inline-flex items-center gap-1 text-green-600">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t('compare.judgeVerified')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.REVISED) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-600">
        <RefreshCw className="h-3.5 w-3.5" />
        {t('compare.judgeRevised')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.ESCALATED) {
    return (
      <span className="inline-flex items-center gap-1 text-blue-600">
        <ArrowUpCircle className="h-3.5 w-3.5" />
        {t('compare.judgeEscalated')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.FAILED) {
    return (
      <span className="inline-flex items-center gap-1 text-red-600">
        <AlertTriangle className="h-3.5 w-3.5" />
        {t('compare.judgeFailed')}
      </span>
    );
  }
  if (judgeState === CompareJudgeState.UNAVAILABLE) {
    return (
      <span className="inline-flex items-center gap-1 text-orange-600">
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
