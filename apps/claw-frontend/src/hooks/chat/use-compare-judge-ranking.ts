import { useMemo } from 'react';

import type { CompareJudgeVerdict, UseCompareJudgeRankingReturn } from '@/types';
import { buildCompareRankingRows, getCompareJudgeNoticeKey } from '@/utilities';

/** View model for the comparative judge's ranking panel (ADR-116). */
export function useCompareJudgeRanking(verdict: CompareJudgeVerdict): UseCompareJudgeRankingReturn {
  return useMemo(() => {
    const noticeKey = getCompareJudgeNoticeKey(verdict);
    const rows = noticeKey === null ? buildCompareRankingRows(verdict) : [];
    return {
      rows,
      hasRanking: rows.length > 0,
      isTie: verdict.tiedLaneIndices.length > 1,
      noticeKey,
    };
  }, [verdict]);
}
