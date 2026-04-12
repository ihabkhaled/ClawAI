'use client';

import { FlaskConical } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { ReplayFiltersForm } from '@/components/routing/replay-filters';
import { ReplayResultRow } from '@/components/routing/replay-result-row';
import { ReplaySummaryCard } from '@/components/routing/replay-summary-card';
import { useReplayLabPage } from '@/hooks/routing/use-replay-lab-page';

export default function ReplayLabPage(): React.ReactElement {
  const {
    t,
    routingMode,
    setRoutingMode,
    limit,
    setLimit,
    handleRunReplay,
    result,
    isPending,
    isError,
    error,
  } = useReplayLabPage();

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader
        title={t('replay.title')}
        description={t('replay.description')}
      />

      <ReplayFiltersForm
        routingMode={routingMode}
        onRoutingModeChange={setRoutingMode}
        limit={limit}
        onLimitChange={setLimit}
        onSubmit={handleRunReplay}
        isPending={isPending}
        t={t}
      />

      {isPending && <LoadingSpinner label={t('replay.running')} />}

      {isError && (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-destructive">
            {error?.message ?? t('routing.loadFailed')}
          </p>
        </div>
      )}

      {!isPending && !isError && result ? (
        <>
          <ReplaySummaryCard result={result} t={t} />

          <div className="space-y-3">
            {result.results.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title={t('replay.noResults')}
                description={t('replay.noResults')}
              />
            ) : (
              result.results.map((r, i) => (
                <ReplayResultRow key={`${r.originalDecision.selectedProvider}-${r.originalDecision.selectedModel}-${String(i)}`} result={r} index={i} t={t} />
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
    </div>
  );
}
