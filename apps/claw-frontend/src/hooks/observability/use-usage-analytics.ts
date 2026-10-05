import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { QUERY_POLL_BACKGROUND_MS } from '@/constants/query-policy.constants';
import { USAGE_DEFAULT_HOURS, USAGE_LIST_LIMIT } from '@/constants/usage-analytics.constants';
import { Permission } from '@/enums/permission.enum';
import { UsageRangePreset } from '@/enums/usage-range-preset.enum';
import { usePermissions } from '@/hooks/auth/use-permissions';
import { adminUsageAnalyticsRepository } from '@/repositories/admin/usage-analytics.repository';
import { queryKeys } from '@/repositories/shared/query-keys';
import type {
  UseUsageAnalyticsReturn,
  UsageRangeSelection,
} from '@/types/admin-usage-analytics.types';
import { buildRangeQuery, validateSelection } from '@/utilities/usage-analytics.utility';

const INITIAL_SELECTION: UsageRangeSelection = {
  preset: UsageRangePreset.Today,
  hours: USAGE_DEFAULT_HOURS,
  customFrom: '',
  customTo: '',
};

/**
 * Filters and data for the admin "Platform usage" section of /observability.
 *
 * Presets apply at once. The numeric hours, the custom dates and the user id
 * are edited as a DRAFT and sent only on Apply, so typing "1", "12", "120" does
 * not fire three queries (the third of which would be rejected). An invalid
 * draft is never sent: `issue` explains why and the last good data stays up.
 */
export function useUsageAnalytics(): UseUsageAnalyticsReturn {
  const { can } = usePermissions();
  const canView = can(Permission.ADMIN_USAGE_VIEW);
  const [draft, setDraft] = useState<UsageRangeSelection>(INITIAL_SELECTION);
  const [applied, setApplied] = useState<UsageRangeSelection>(INITIAL_SELECTION);
  const [userIdDraft, setUserIdDraft] = useState('');
  const [appliedUserId, setAppliedUserId] = useState('');

  const issue = useMemo(() => validateSelection(draft), [draft]);

  const query = useQuery({
    queryKey: queryKeys.admin.usageAnalytics({ ...applied }, appliedUserId),
    enabled: canView,
    // A dashboard: it drifts, but nobody is waiting on a particular row.
    refetchInterval: QUERY_POLL_BACKGROUND_MS,
    queryFn: () =>
      adminUsageAnalyticsRepository.getOverview({
        ...buildRangeQuery(applied, new Date()),
        ...(appliedUserId === '' ? {} : { userId: appliedUserId }),
        limit: USAGE_LIST_LIMIT,
      }),
  });

  const setPreset = useCallback((preset: UsageRangePreset): void => {
    setDraft((current) => ({ ...current, preset }));
    // Rolling presets need no further input: send them straight away.
    if (preset !== UsageRangePreset.Hours && preset !== UsageRangePreset.Custom) {
      setApplied((current) => ({ ...current, preset }));
    }
  }, []);

  const setHours = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, hours: Number(value) }));
  }, []);
  const setCustomFrom = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, customFrom: value }));
  }, []);
  const setCustomTo = useCallback((value: string): void => {
    setDraft((current) => ({ ...current, customTo: value }));
  }, []);

  const apply = useCallback((): void => {
    if (issue !== null) {
      return;
    }
    setApplied(draft);
    setAppliedUserId(userIdDraft.trim());
  }, [draft, issue, userIdDraft]);

  const clearUser = useCallback((): void => {
    setUserIdDraft('');
    setAppliedUserId('');
  }, []);

  const refetch = useCallback((): void => {
    void query.refetch();
  }, [query]);

  return {
    canView,
    draft,
    applied,
    userIdDraft,
    appliedUserId,
    issue,
    setPreset,
    setHours,
    setCustomFrom,
    setCustomTo,
    setUserIdDraft,
    apply,
    clearUser,
    analytics: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch,
  };
}
