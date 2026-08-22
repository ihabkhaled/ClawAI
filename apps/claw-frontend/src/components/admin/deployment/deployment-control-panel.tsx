import { DeploymentState } from '@claw/shared-types';
import { Info, SlidersHorizontal } from 'lucide-react';

import { DeploymentAutomationSwitch } from '@/components/admin/deployment/deployment-automation-switch';
import { DeploymentManualActions } from '@/components/admin/deployment/deployment-manual-actions';
import { DeploymentRecoveryPanel } from '@/components/admin/deployment/deployment-recovery-panel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { DeploymentControlPanelProps } from '@/types/deployment-page.types';

export function DeploymentControlPanel({
  t,
  status,
  actions,
}: DeploymentControlPanelProps): React.ReactElement {
  const isRecoverable = status.isStale || status.state === DeploymentState.RUNNING;

  return (
    <Card variant="elevated">
      <CardHeader className="gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <SlidersHorizontal className="text-primary h-4 w-4" aria-hidden="true" />
          {t('adminDeployment.controlsTitle')}
        </CardTitle>
        <p className="text-muted-foreground text-sm">{t('adminDeployment.controlsDescription')}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <DeploymentAutomationSwitch t={t} status={status} actions={actions} />
        {status.manualTriggerEnabled ? (
          <DeploymentManualActions t={t} status={status} actions={actions} />
        ) : (
          <div
            className="border-border/60 text-muted-foreground flex items-start gap-3 rounded-lg border border-dashed p-4 text-sm"
            role="note"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{t('adminDeployment.manualUnavailable')}</span>
          </div>
        )}
        {isRecoverable ? <DeploymentRecoveryPanel t={t} status={status} actions={actions} /> : null}
      </CardContent>
    </Card>
  );
}
