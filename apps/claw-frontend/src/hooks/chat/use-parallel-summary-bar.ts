import { useMemo } from 'react';

import { ParallelModelStatus } from '@/enums';
import type { ChatMessage } from '@/types';
import {
  getBestResponse,
  getFastestModel,
  messagesToParallelResponses,
  resolveBestResponse,
} from '@/utilities';

export function useParallelSummaryBar(messages: ChatMessage[]): {
  completedCount: number;
  failedCount: number;
  timeoutCount: number;
  fastestModel: string | null;
  bestModel: string | null;
  bestIsJudged: boolean;
  avgLatencyMs: number;
  totalTokens: number;
} {
  return useMemo(() => {
    const responses = messagesToParallelResponses(messages);
    const best = resolveBestResponse(responses, getBestResponse(responses));

    const completed = responses.filter((r) => r.status === ParallelModelStatus.COMPLETED);
    const failed = responses.filter((r) => r.status === ParallelModelStatus.FAILED);
    const timedOut = responses.filter((r) => r.status === ParallelModelStatus.TIMEOUT);

    const avgLatencyMs =
      completed.length > 0
        ? Math.round(completed.reduce((sum, r) => sum + r.latencyMs, 0) / completed.length)
        : 0;

    const totalTokens = responses.reduce(
      (sum, r) => sum + (r.inputTokens ?? 0) + (r.outputTokens ?? 0),
      0,
    );

    return {
      completedCount: completed.length,
      failedCount: failed.length,
      timeoutCount: timedOut.length,
      fastestModel: getFastestModel(responses),
      // With the judge on, only its winner is "best" — never the heuristic.
      bestModel: best.model,
      bestIsJudged: best.judged,
      avgLatencyMs,
      totalTokens,
    };
  }, [messages]);
}
