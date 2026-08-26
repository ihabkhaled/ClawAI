'use client';

import { Inbox } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { CandidateCard } from '@/components/discovery/candidate-card';
import { DiscoveryToolbar } from '@/components/discovery/discovery-toolbar';
import { HardwarePacksGrid } from '@/components/discovery/hardware-packs-grid';
import { RunsTimeline } from '@/components/discovery/runs-timeline';
import { useDiscoveryPage } from '@/hooks/discovery/use-discovery-page';

export default function DiscoveryPage(): React.ReactElement {
  const {
    t,
    runs,
    candidates,
    candidatesTotal,
    packs,
    statusFilter,
    searchFilter,
    isLoadingRuns,
    isLoadingCandidates,
    isLoadingPacks,
    isTriggerPending,
    isApprovePending,
    isRejectPending,
    isInstallPackPending,
    setStatusFilter,
    setSearchFilter,
    handleTriggerRefresh,
    handleTriggerDryRun,
    handleApprove,
    handleReject,
    handleInstallPack,
  } = useDiscoveryPage();

  return (
    <div className="space-y-6">
      <PageHeader title={t('discovery.title')} description={t('discovery.description')} />

      <DiscoveryToolbar
        statusFilter={statusFilter}
        searchFilter={searchFilter}
        onStatusChange={setStatusFilter}
        onSearchChange={setSearchFilter}
        onTriggerRefresh={() => handleTriggerRefresh()}
        onTriggerDryRun={handleTriggerDryRun}
        isTriggerPending={isTriggerPending}
        t={t}
      />

      <RunsTimeline runs={runs} isLoading={isLoadingRuns} t={t} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {t('discovery.candidates.title')} ({candidatesTotal})
        </h2>
        {isLoadingCandidates ? <LoadingSpinner label={t('common.loading')} /> : null}
        {!isLoadingCandidates && candidates.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t('discovery.candidates.empty.title')}
            description={t('discovery.candidates.empty.description')}
          />
        ) : null}
        {!isLoadingCandidates && candidates.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.map((candidate) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onApprove={handleApprove}
                onReject={handleReject}
                isApprovePending={isApprovePending}
                isRejectPending={isRejectPending}
                t={t}
              />
            ))}
          </div>
        ) : null}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t('discovery.packs.title')}</h2>
        <HardwarePacksGrid
          packs={packs}
          isLoading={isLoadingPacks}
          isInstallPending={isInstallPackPending}
          onInstall={handleInstallPack}
          t={t}
        />
      </section>
    </div>
  );
}
