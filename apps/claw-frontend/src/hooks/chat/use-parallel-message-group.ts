import { useMemo } from 'react';

import type { ChatMessage, CompareJudgeVerdict, ParallelModelResponse } from '@/types';
import {
  getBestResponse,
  getCompareJudgeVerdict,
  getFastestModel,
  messageToParallelResponse,
  resolveBestResponse,
} from '@/utilities';

export function useParallelMessageGroup(messages: ChatMessage[]): {
  responses: ParallelModelResponse[];
  fastestModel: string | null;
  bestModel: string | null;
  bestIsJudged: boolean;
  judgeVerdict: CompareJudgeVerdict | null;
} {
  const responses = useMemo(
    () => messages.map((message) => messageToParallelResponse(message)),
    [messages],
  );

  const fastestModel = useMemo(() => getFastestModel(responses), [responses]);
  // With the judge on, "best" is the comparative judge's winner or nothing.
  const best = useMemo(
    () => resolveBestResponse(responses, getBestResponse(responses)),
    [responses],
  );
  const judgeVerdict = useMemo(() => getCompareJudgeVerdict(responses), [responses]);

  return {
    responses,
    fastestModel,
    bestModel: best.model,
    bestIsJudged: best.judged,
    judgeVerdict,
  };
}
