import { useMemo, useState } from 'react';

import { CandidateStatus } from '@/enums';
import { useTranslation } from '@/lib/i18n';
import type { CandidateListFilters, DiscoveryPageReturn } from '@/types';

import {
  useApproveCandidate,
  useBulkApproveCandidates,
  useDiscoveryCandidates,
  useRejectCandidate,
} from './use-discovery-candidates';
import { useDiscoveryRuns, useTriggerDiscovery } from './use-discovery-runs';
import { useDiscoverySources } from './use-discovery-sources';
import { useHardwarePacks, useInstallPack } from './use-hardware-packs';

export function useDiscoveryPage(): DiscoveryPageReturn {
  const { t } = useTranslation();
  const [statusFilter, setStatusFilter] = useState<CandidateStatus | undefined>(
    CandidateStatus.PENDING,
  );
  const [searchFilter, setSearchFilter] = useState<string>('');

  const candidateFilters = useMemo<CandidateListFilters>(
    () => ({
      status: statusFilter,
      search: searchFilter.trim() === '' ? undefined : searchFilter.trim(),
      pageSize: 50,
    }),
    [statusFilter, searchFilter],
  );

  const sourcesQuery = useDiscoverySources();
  const runsQuery = useDiscoveryRuns({ pageSize: 10 });
  const candidatesQuery = useDiscoveryCandidates(candidateFilters);
  const packsQuery = useHardwarePacks();
  const triggerMutation = useTriggerDiscovery();
  const approveMutation = useApproveCandidate();
  const rejectMutation = useRejectCandidate();
  const bulkMutation = useBulkApproveCandidates();
  const installPackMutation = useInstallPack();

  return {
    t,
    sources: sourcesQuery.sources,
    runs: runsQuery.runs,
    candidates: candidatesQuery.candidates,
    candidatesTotal: candidatesQuery.total,
    packs: packsQuery.packs,
    statusFilter,
    searchFilter,
    isLoadingSources: sourcesQuery.isLoading,
    isLoadingRuns: runsQuery.isLoading,
    isLoadingCandidates: candidatesQuery.isLoading,
    isLoadingPacks: packsQuery.isLoading,
    isTriggerPending: triggerMutation.isPending,
    isApprovePending: approveMutation.isPending,
    isRejectPending: rejectMutation.isPending,
    isBulkApprovePending: bulkMutation.isPending,
    isInstallPackPending: installPackMutation.isPending,
    setStatusFilter,
    setSearchFilter,
    handleTriggerRefresh: (sourceId?: string) =>
      triggerMutation.mutate({ sourceId, isDryRun: false }),
    handleTriggerDryRun: () => triggerMutation.mutate({ isDryRun: true }),
    handleApprove: (id: string) => approveMutation.mutate({ id, data: {} }),
    handleReject: (id: string, reason: string) => rejectMutation.mutate({ id, data: { reason } }),
    handleBulkApprove: (ids: string[]) => bulkMutation.mutate({ candidateIds: ids }),
    handleInstallPack: (profile: string) => installPackMutation.mutate(profile),
  };
}
