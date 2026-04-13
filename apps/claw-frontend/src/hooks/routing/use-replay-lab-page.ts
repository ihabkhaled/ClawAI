import { useCallback, useState } from 'react';

import { REPLAY_DEFAULT_LIMIT, REPLAY_TAB_RESULTS } from '@/constants';
import { useTranslation } from '@/lib/i18n';
import type { UseReplayLabPageReturn } from '@/types';

import { useCompareRuns } from './use-compare-runs';
import { usePromoteCase } from './use-promote-case';
import { useReplayRouting } from './use-replay-routing';
import { useReplayRuns } from './use-replay-runs';
import { useReviewCase } from './use-review-case';
import { useSuspiciousCases } from './use-suspicious-cases';

export function useReplayLabPage(): UseReplayLabPageReturn {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(REPLAY_TAB_RESULTS);
  const [routingMode, setRoutingMode] = useState<string | undefined>();
  const [threadId, setThreadId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [limit, setLimit] = useState<number>(REPLAY_DEFAULT_LIMIT);
  const [saveRun, setSaveRun] = useState<boolean>(false);
  const [runName, setRunName] = useState<string>('');

  const [compareRunId1, setCompareRunId1] = useState<string | null>(null);
  const [compareRunId2, setCompareRunId2] = useState<string | null>(null);

  const { replayRouting, data, isPending, isError, error } = useReplayRouting();
  const { runs, isLoading: isRunsLoading } = useReplayRuns();
  const latestRunId = data?.runId;
  const { cases: suspiciousCases, isLoading: isSuspiciousLoading } =
    useSuspiciousCases(latestRunId);
  const { reviewCase, isPending: isReviewPending } = useReviewCase();
  const { mutate: promoteCase, isPending: isPromotePending } = usePromoteCase(latestRunId ?? '');
  const { data: compareResult, isLoading: isCompareLoading } = useCompareRuns(
    compareRunId1,
    compareRunId2,
  );

  const handleRunReplay = useCallback(() => {
    replayRouting({
      routingMode,
      threadId: threadId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      limit,
      saveRun,
      runName: runName || undefined,
    });
  }, [replayRouting, routingMode, threadId, startDate, endDate, limit, saveRun, runName]);

  const handleReviewCase = useCallback(
    (caseId: string, isRegression: boolean, notes: string) => {
      reviewCase({
        caseId,
        data: { isConfirmedRegression: isRegression, reviewNotes: notes || undefined },
      });
    },
    [reviewCase],
  );

  const handlePromoteCase = useCallback(
    (caseId: string) => {
      promoteCase(caseId);
    },
    [promoteCase],
  );

  return {
    t,
    activeTab,
    setActiveTab,
    routingMode,
    setRoutingMode,
    threadId,
    setThreadId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    limit,
    setLimit,
    saveRun,
    setSaveRun,
    runName,
    setRunName,
    handleRunReplay,
    result: data,
    isPending,
    isError,
    error,
    runs,
    isRunsLoading,
    suspiciousCases,
    isSuspiciousLoading,
    handleReviewCase,
    isReviewPending,
    handlePromoteCase,
    isPromotePending,
    compareRunId1,
    compareRunId2,
    setCompareRunId1,
    setCompareRunId2,
    compareResult,
    isCompareLoading,
  };
}
