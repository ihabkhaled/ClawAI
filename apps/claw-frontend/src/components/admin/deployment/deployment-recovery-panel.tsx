import { Eraser, Loader2, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { DeploymentControlPanelProps } from '@/types/deployment-page.types';

/**
 * Shown only for a rollout that stopped reporting. Clearing it rewrites the
 * status record as failed so the next dispatch is not blocked behind it — it
 * does not stop a workflow or move production.
 */
export function DeploymentRecoveryPanel({
  t,
  actions,
}: DeploymentControlPanelProps): React.ReactElement {
  return (
    <div className="border-warning/30 bg-warning-surface flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <TriangleAlert className="text-warning mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t('adminDeployment.recoveryTitle')}</p>
          <p className="text-muted-foreground max-w-prose text-sm">
            {t('adminDeployment.recoveryHint')}
          </p>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full shrink-0 gap-2 sm:w-auto"
        onClick={actions.reset}
        disabled={actions.isBusy}
      >
        {actions.isResetting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Eraser className="h-4 w-4" aria-hidden="true" />
        )}
        {t('adminDeployment.reset')}
      </Button>
    </div>
  );
}
