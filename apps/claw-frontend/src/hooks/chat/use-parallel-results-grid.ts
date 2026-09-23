import { useMemo } from 'react';

import { useCompareExportAll } from '@/hooks/chat/use-compare-export-all';
import type { ChatMessage, CompareJudgeVerdict, ParallelModelResponse } from '@/types';
import {
  getBestResponse,
  getCompareJudgeVerdict,
  getFastestModel,
  messagesToParallelResponses,
  resolveBestResponse,
} from '@/utilities';

export function useParallelResultsGrid(
  messages: ChatMessage[],
  prompt = '',
): {
  responses: ParallelModelResponse[];
  fastestModel: string | null;
  bestModel: string | null;
  bestIsJudged: boolean;
  judgeVerdict: CompareJudgeVerdict | null;
  exportAll: () => void;
} {
  // Per-card expand/scroll now lives in `useCompareResultCard`; this controller
  // only assembles the grid-level data + the combined "export all" action.
  const responses = useMemo(() => messagesToParallelResponses(messages), [messages]);
  const fastestModel = useMemo(() => getFastestModel(responses), [responses]);
  // With the judge on, "best" is the comparative judge's winner or nothing.
  const best = useMemo(
    () => resolveBestResponse(responses, getBestResponse(responses)),
    [responses],
  );
  const judgeVerdict = useMemo(() => getCompareJudgeVerdict(responses), [responses]);
  const { exportAll } = useCompareExportAll(prompt, responses);

  return {
    responses,
    fastestModel,
    bestModel: best.model,
    bestIsJudged: best.judged,
    judgeVerdict,
    exportAll,
  };
}
