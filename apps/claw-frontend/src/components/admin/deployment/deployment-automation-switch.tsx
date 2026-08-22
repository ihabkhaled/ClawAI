import { Zap, ZapOff } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import type { DeploymentControlPanelProps } from '@/types/deployment-page.types';

export function DeploymentAutomationSwitch({
  t,
  status,
  actions,
}: DeploymentControlPanelProps): React.ReactElement {
  const isOn = status.automaticDeployEnabled;
  const Icon = isOn ? Zap : ZapOff;

  return (
    <div className="border-border/60 bg-muted/30 flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <Icon
          className={isOn ? 'text-success mt-0.5 h-5 w-5' : 'text-warning mt-0.5 h-5 w-5'}
          aria-hidden="true"
        />
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold">{t('adminDeployment.automaticTitle')}</p>
            <Badge variant={isOn ? 'success' : 'warning'}>
              {isOn ? t('adminDeployment.automaticOn') : t('adminDeployment.automaticOff')}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-prose text-sm">
            {isOn ? t('adminDeployment.automaticOnHint') : t('adminDeployment.automaticOffHint')}
          </p>
        </div>
      </div>
      <Switch
        checked={isOn}
        onCheckedChange={actions.setAutomaticDeploy}
        disabled={actions.isBusy}
        aria-label={t('adminDeployment.automaticTitle')}
        className="self-start sm:self-center"
      />
    </div>
  );
}
