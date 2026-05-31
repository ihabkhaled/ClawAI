'use client';

import { FlaskConical } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ReplayExportPanel } from '@/components/routing/replay-export-panel';
import { ReplayFiltersForm } from '@/components/routing/replay-filters';
import { ReplayNeedsReviewList } from '@/components/routing/replay-needs-review-list';
import { ReplayResultRow } from '@/components/routing/replay-result-row';
import { ReplayRunHistory } from '@/components/routing/replay-run-history';
import { ReplaySummaryCard } from '@/components/routing/replay-summary-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { REPLAY_TAB_HISTORY, REPLAY_TAB_NEEDS_REVIEW, REPLAY_TAB_RESULTS } from '@/constants';
import { useReplayLabPage } from '@/hooks/routing/use-replay-lab-page';

export default function ReplayLabPage(): React.ReactElement {
  const {
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
    result,
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
  } = useReplayLabPage();

  return (
    <div className="space-y-6">
      <PageHeader title={t('replay.title')} description={t('replay.description')} />

      <ReplayFiltersForm
        routingMode={routingMode}
        onRoutingModeChange={setRoutingMode}
        threadId={threadId}
        onThreadIdChange={setThreadId}
        startDate={startDate}
        onStartDateChange={setStartDate}
        endDate={endDate}
        onEndDateChange={setEndDate}
        limit={limit}
        onLimitChange={setLimit}
        saveRun={saveRun}
        onSaveRunChange={setSaveRun}
        runName={runName}
        onRunNameChange={setRunName}
        onSubmit={handleRunReplay}
        isPending={isPending}
        t={t}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value={REPLAY_TAB_RESULTS}>{t('replay.runResults')}</TabsTrigger>
          <TabsTrigger value={REPLAY_TAB_NEEDS_REVIEW}>
            {t('replay.needsReview')}
            {suspiciousCases.length > 0 ? ` (${suspiciousCases.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value={REPLAY_TAB_HISTORY}>{t('replay.runsHistory')}</TabsTrigger>
        </TabsList>

        <TabsContent value={REPLAY_TAB_RESULTS} className="mt-4 space-y-4">
          {isPending ? <LoadingSpinner label={t('replay.running')} /> : null}

          {isError ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-destructive">
                {error?.message ?? t('routing.loadFailed')}
              </p>
            </div>
          ) : null}

          {!isPending && !isError && result ? (
            <>
              <div className="flex items-center justify-between">
                <ReplaySummaryCard result={result} t={t} />
              </div>

              {result.runId ? (
                <div className="flex justify-end">
                  <ReplayExportPanel runId={result.runId} t={t} />
                </div>
              ) : null}

              <div className="space-y-3">
                {result.results.length === 0 ? (
                  <EmptyState
                    icon={FlaskConical}
                    title={t('replay.noResults')}
                    description={t('replay.noResults')}
                  />
                ) : (
                  result.results.map((r, i) => (
                    <ReplayResultRow
                      key={`${r.originalDecision.selectedProvider}-${String(i)}`}
                      result={r}
                      index={i}
                      t={t}
                    />
                  ))
                )}
              </div>
            </>
          ) : null}

          {!isPending && !isError && !result ? (
            <EmptyState
              icon={FlaskConical}
              title={t('replay.noResults')}
              description={t('replay.description')}
            />
          ) : null}
        </TabsContent>

        <TabsContent value={REPLAY_TAB_NEEDS_REVIEW} className="mt-4">
          {isSuspiciousLoading ? (
            <LoadingSpinner label={t('common.loading')} />
          ) : (
            <ReplayNeedsReviewList
              cases={suspiciousCases}
              onReview={handleReviewCase}
              isReviewPending={isReviewPending}
              onPromote={handlePromoteCase}
              isPromotePending={isPromotePending}
              t={t}
            />
          )}
        </TabsContent>

        <TabsContent value={REPLAY_TAB_HISTORY} className="mt-4">
          <ReplayRunHistory
            runs={runs}
            isLoading={isRunsLoading}
            compareRunId1={compareRunId1}
            compareRunId2={compareRunId2}
            onCompareRunId1Change={setCompareRunId1}
            onCompareRunId2Change={setCompareRunId2}
            compareResult={compareResult}
            isCompareLoading={isCompareLoading}
            t={t}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
