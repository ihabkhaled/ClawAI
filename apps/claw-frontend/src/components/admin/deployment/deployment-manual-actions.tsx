import { DeploymentTriggerMode } from '@claw/shared-types';
import { History, Loader2, Rocket, Target } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEPLOYMENT_SHA_MAX_LENGTH } from '@/constants/deployment.constants';
import type { DeploymentControlPanelProps } from '@/types/deployment-page.types';

export function DeploymentManualActions({
  t,
  status,
  actions,
}: DeploymentControlPanelProps): React.ReactElement {
  const isPending = (mode: DeploymentTriggerMode): boolean => actions.pendingMode === mode;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Button
          type="button"
          className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
          onClick={actions.deployLatest}
          disabled={actions.isBusy}
        >
          {isPending(DeploymentTriggerMode.LATEST) ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <Rocket className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold">{t('adminDeployment.deployLatest')}</span>
            <span className="text-primary-foreground/80 text-xs font-normal">
              {t('adminDeployment.deployLatestHint')}
            </span>
          </span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
          onClick={actions.redeploy}
          disabled={actions.isBusy || status.deployedSha === null}
        >
          {isPending(DeploymentTriggerMode.REDEPLOY) ? (
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
          ) : (
            <History className="h-5 w-5 shrink-0" aria-hidden="true" />
          )}
          <span className="flex min-w-0 flex-col">
            <span className="font-semibold">{t('adminDeployment.redeploy')}</span>
            <span className="text-muted-foreground truncate font-mono text-xs font-normal">
              {status.deployedSha?.slice(0, 12) ?? t('adminDeployment.redeployUnavailable')}
            </span>
          </span>
        </Button>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="deployment-target-sha"
          className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
        >
          {t('adminDeployment.shaLabel')}
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="deployment-target-sha"
            value={actions.targetSha}
            onChange={(event) => actions.setTargetSha(event.target.value)}
            placeholder={t('adminDeployment.shaPlaceholder')}
            maxLength={DEPLOYMENT_SHA_MAX_LENGTH}
            spellCheck={false}
            autoComplete="off"
            error={actions.targetSha.length > 0 && !actions.isShaValid}
            className="font-mono sm:flex-1"
          />
          <Button
            type="button"
            variant="secondary"
            className="w-full gap-2 sm:w-auto"
            onClick={actions.deploySha}
            disabled={actions.isBusy || !actions.isShaValid}
          >
            {isPending(DeploymentTriggerMode.SHA) ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Target className="h-4 w-4" aria-hidden="true" />
            )}
            {t('adminDeployment.deploySha')}
          </Button>
        </div>
        <p className="text-muted-foreground text-xs">{t('adminDeployment.shaHint')}</p>
      </div>
    </div>
  );
}
