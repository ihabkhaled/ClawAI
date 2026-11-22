import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { LIVE_ADMIN_DEFAULT_DAYS } from '@/constants/live.constants';
import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { useAdminLivePolicy } from '@/hooks/admin/live/use-admin-live-policy';
import { useTranslation } from '@/lib/i18n';
import { liveAdminRepository } from '@/repositories/live/live-admin.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type { UseAdminLiveResult } from '@/types/live-admin.types';
import { showToast } from '@/utilities';

/** Controller for /admin/live: overview (BACKGROUND poll), emergency stop, and the policy editor. */
export function useAdminLive(): UseAdminLiveResult {
  const { t, locale } = useTranslation();
  const client = useQueryClient();
  const [days, setDays] = useState(LIVE_ADMIN_DEFAULT_DAYS);
  const [stopRunId, setStopRunId] = useState<string | null>(null);
  const overview = useQuery({
    queryKey: queryKeys.live.adminOverview(days),
    queryFn: () => liveAdminRepository.getOverview(days),
    placeholderData: keepPreviousData,
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
  });
  const stop = useMutation({
    mutationFn: (runId: string) => liveAdminRepository.stopRun(runId),
    onSuccess: () => {
      showToast.success({ description: t('live.admin.stopped') });
      void client.invalidateQueries({ queryKey: queryKeys.live.all });
    },
    onError: (error: Error) => showToast.apiError(error, t('live.admin.stopError')),
    onSettled: () => setStopRunId(null),
  });
  const policy = useAdminLivePolicy();
  const { mutate: stopMutate } = stop;
  const { refetch } = overview;

  return {
    t,
    locale,
    days,
    setDays,
    overview: overview.data ?? null,
    isOverviewLoading: overview.isLoading,
    isOverviewError: overview.isError,
    retryOverview: () => void refetch(),
    ...policy,
    stopRunId,
    pendingRunId: stop.isPending ? (stop.variables ?? null) : null,
    askStopRun: setStopRunId,
    confirmStopRun: () => (stopRunId === null ? undefined : stopMutate(stopRunId)),
  };
}
