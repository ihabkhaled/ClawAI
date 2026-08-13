import { DeploymentState } from '@claw/shared-types';
import { Clock3, ExternalLink, GitCommitHorizontal, PackageCheck, Server } from 'lucide-react';

import { DeploymentPhaseRail } from '@/components/admin/deployment/deployment-phase-rail';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeploymentStatusContentProps } from '@/types/deployment-page.types';

export function DeploymentStatusContent({
  status,
  t,
  locale,
}: DeploymentStatusContentProps): React.ReactElement {
  const displayTime = status.updatedAt
    ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'medium' }).format(
        new Date(status.updatedAt),
      )
    : t('adminDeployment.notAvailable');
  let stateVariant: BadgeProps['variant'] = 'secondary';
  if (status.state === DeploymentState.COMPLETED) {
    stateVariant = 'success';
  } else if (status.state === DeploymentState.FAILED) {
    stateVariant = 'destructive';
  } else if (status.state === DeploymentState.RUNNING) {
    stateVariant = 'info';
  }

  return (
    <div className="space-y-6" aria-live={status.state === 'running' ? 'polite' : 'off'}>
      {status.isStale ? (
        <div
          className="border-warning/30 bg-warning-surface text-warning rounded-lg border p-4 text-sm"
          role="alert"
        >
          {t('adminDeployment.staleWarning')}
        </div>
      ) : null}

      <Card variant="elevated" className="overflow-hidden">
        <div className="from-primary/15 via-primary/5 h-1 bg-gradient-to-r to-transparent" />
        <CardHeader className="gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground font-mono text-xs tracking-[0.18em] uppercase">
              {t('adminDeployment.flightRecorder')}
            </p>
            <CardTitle className="text-xl">{t(`adminDeployment.state.${status.state}`)}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {t(`adminDeployment.phase.${status.phase}`)}
              {status.currentService ? ` · ${status.currentService}` : ''}
            </p>
          </div>
          <Badge variant={stateVariant}>{t(`adminDeployment.state.${status.state}`)}</Badge>
        </CardHeader>
        <CardContent>
          <DeploymentPhaseRail status={status} t={t} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <PackageCheck className="text-primary mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground text-xs">{t('adminDeployment.version')}</p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {status.version ?? t('adminDeployment.notAvailable')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <GitCommitHorizontal className="text-primary mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground text-xs">{t('adminDeployment.commit')}</p>
              <p className="mt-1 font-mono text-sm font-semibold">
                {status.targetSha?.slice(0, 12) ?? t('adminDeployment.notAvailable')}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Clock3 className="text-primary mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground text-xs">{t('adminDeployment.lastUpdate')}</p>
              <p className="mt-1 text-sm font-semibold">{displayTime}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-start gap-3 pt-6">
            <Server className="text-primary mt-0.5 h-5 w-5" aria-hidden="true" />
            <div>
              <p className="text-muted-foreground text-xs">{t('adminDeployment.services')}</p>
              <p className="mt-1 text-sm font-semibold">{status.services.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('adminDeployment.selectedServices')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {status.services.length > 0 ? (
            status.services.map((service) => (
              <Badge key={service} variant="outline" className="font-mono font-normal">
                {service}
              </Badge>
            ))
          ) : (
            <p className="text-muted-foreground text-sm">{t('adminDeployment.noServices')}</p>
          )}
          {status.workflowUrl ? (
            <a
              href={status.workflowUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary ml-auto inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline"
            >
              {t('adminDeployment.openWorkflow')}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
