import { DeploymentRunStatus, DeploymentRunUnavailableReason } from '@claw/shared-types';
import { Activity, ExternalLink, Info, Loader2 } from 'lucide-react';

import { DeploymentRunJobRow } from '@/components/admin/deployment/deployment-run-job-row';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeploymentRunProgressCardProps } from '@/types/deployment-page.types';
import { runConclusionVariant, runStateKey } from '@/utilities/deployment-run.utility';

/**
 * Live GitHub Actions progress: the run, its jobs, and every step with the one
 * currently executing highlighted. This reads the workflow itself rather than
 * the status file, so it shows what is actually running even when the box has
 * stopped reporting.
 */
export function DeploymentRunProgressCard({
  t,
  locale,
  progress,
}: DeploymentRunProgressCardProps): React.ReactElement {
  const run = progress.progress?.run ?? null;
  const startedAt = run?.startedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(
        new Date(run.startedAt),
      )
    : null;

  return (
    <Card variant="elevated">
      <CardHeader className="gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="text-primary h-4 w-4" aria-hidden="true" />
            {t('adminDeployment.runTitle')}
          </CardTitle>
          <p className="text-muted-foreground text-sm">{t('adminDeployment.runDescription')}</p>
        </div>
        {run ? (
          <div className="flex shrink-0 items-center gap-2">
            <Badge variant={runConclusionVariant(run.status, run.conclusion)}>
              {t(runStateKey(run.status, run.conclusion))}
            </Badge>
            <a
              href={run.url}
              target="_blank"
              rel="noreferrer"
              className="text-primary inline-flex items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
            >
              {t('adminDeployment.runOpen')}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {progress.isLoading ? <LoadingSpinner label={t('adminDeployment.runLoading')} /> : null}

        {!progress.isLoading && !run ? (
          <div
            className="border-border/60 text-muted-foreground flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm"
            role="note"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {t(
                `adminDeployment.runUnavailable.${progress.progress?.reason ?? DeploymentRunUnavailableReason.NOT_CONFIGURED}`,
              )}
            </span>
          </div>
        ) : null}

        {run ? (
          <>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">
                {t('adminDeployment.runNumber')} #{run.runNumber}
              </span>
              <span className="font-mono text-xs">{run.headSha.slice(0, 12)}</span>
              {startedAt ? <span className="text-muted-foreground">{startedAt}</span> : null}
            </div>

            {run.currentStep ? (
              <div
                className="border-info/40 bg-info-surface flex items-center gap-3 rounded-lg border p-3 text-sm"
                aria-live="polite"
              >
                <Loader2 className="text-info h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="text-muted-foreground">
                    {t('adminDeployment.runNowRunning')}{' '}
                  </span>
                  <span className="font-medium">{run.currentStep.stepName}</span>
                </span>
              </div>
            ) : null}

            {run.failedStep ? (
              <div
                className="border-destructive/30 bg-destructive/5 space-y-1 rounded-lg border p-3 text-sm"
                role="alert"
              >
                <p className="text-destructive font-medium">
                  {t('adminDeployment.runFailedAt')} {run.failedStep.stepName}
                </p>
                <a
                  href={run.failedStep.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-xs font-medium underline-offset-4 hover:underline"
                >
                  {t('adminDeployment.runReadLog')}
                  <ExternalLink className="h-3 w-3" aria-hidden="true" />
                </a>
              </div>
            ) : null}

            <div className="space-y-3">
              {run.jobs.map((job) => (
                <DeploymentRunJobRow key={job.id} t={t} job={job} />
              ))}
            </div>

            {run.status === DeploymentRunStatus.COMPLETED ? null : (
              <p className="text-muted-foreground text-xs">{t('adminDeployment.runAutoRefresh')}</p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
