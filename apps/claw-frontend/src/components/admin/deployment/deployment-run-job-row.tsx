import { ExternalLink } from 'lucide-react';

import { DeploymentRunStepRow } from '@/components/admin/deployment/deployment-run-step-row';
import { Badge } from '@/components/ui/badge';
import type { DeploymentRunJobRowProps } from '@/types/deployment-page.types';
import { runConclusionVariant, runStateKey } from '@/utilities/deployment-run.utility';

export function DeploymentRunJobRow({ t, job }: DeploymentRunJobRowProps): React.ReactElement {
  return (
    <div className="border-border/60 space-y-2 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{job.name}</span>
        <Badge variant={runConclusionVariant(job.status, job.conclusion)}>
          {t(runStateKey(job.status, job.conclusion))}
        </Badge>
        <a
          href={job.url}
          target="_blank"
          rel="noreferrer"
          className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
        >
          {t('adminDeployment.runOpenJob')}
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </div>
      {job.steps.length > 0 ? (
        <ol className="space-y-0.5">
          {job.steps.map((step) => (
            <DeploymentRunStepRow
              key={`${String(job.id)}-${String(step.number)}`}
              t={t}
              step={step}
            />
          ))}
        </ol>
      ) : (
        <p className="text-muted-foreground px-3 text-sm">{t('adminDeployment.runNoSteps')}</p>
      )}
    </div>
  );
}
