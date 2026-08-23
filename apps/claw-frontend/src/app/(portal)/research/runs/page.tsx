'use client';

import { Search } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { EvidenceViewer } from '@/components/research/evidence-viewer';
import { Badge } from '@/components/ui/badge';
import { useResearchRuns } from '@/hooks/research/use-research-runs';
import { useTranslation } from '@/lib/i18n';
import type { ResearchEvidenceBundle } from '@/types';

export default function ResearchRunsPage(): React.ReactElement {
  const { t } = useTranslation();
  const { runs, isLoading, isError } = useResearchRuns(30);

  return (
    <div className="max-w-full min-w-0 space-y-6 overflow-hidden">
      <PageHeader title={t('research.runs.title')} description={t('research.runs.description')} />
      {isLoading ? <LoadingSpinner label={t('common.loading')} /> : null}
      {isError ? (
        <div className="border-destructive/40 bg-destructive/10 text-destructive rounded border p-4 text-sm">
          {t('research.runs.loadFailed')}
        </div>
      ) : null}
      {!isLoading && !isError && runs.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('research.runs.emptyTitle')}
          description={t('research.runs.emptyDescription')}
        />
      ) : null}
      {!isLoading && runs.length > 0 ? (
        <div className="flex flex-col gap-4">
          {runs.map((run) => (
            <div
              key={run.id}
              className="flex max-w-full min-w-0 flex-col gap-2 overflow-hidden rounded border p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <Badge variant="outline">{run.workflow}</Badge>
                  <Badge variant={run.status === 'COMPLETED' ? 'default' : 'secondary'}>
                    {run.status}
                  </Badge>
                  <span className="text-muted-foreground text-xs">
                    {new Date(run.startedAt).toLocaleString()}
                  </span>
                </div>
                <code className="text-muted-foreground touch:text-xs max-w-full text-[10px] break-all">
                  {run.id}
                </code>
              </div>
              <p className="text-sm font-medium break-words">{run.intent}</p>
              {run.errorMessage !== null ? (
                <p className="text-destructive text-xs">{run.errorMessage}</p>
              ) : null}
              {'items' in run.bundle ? (
                <EvidenceViewer bundle={run.bundle as ResearchEvidenceBundle} t={t} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
