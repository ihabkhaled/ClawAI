import type { PlanPluginLimitsProps } from '@/types/plugin-installs.types';
import { formatPluginLimit } from '@/utilities/plugin-installs.utility';

/** The plan list's plugin caps. Unlimited and disabled read differently on purpose. */
export function PlanPluginLimits({ plan, t }: PlanPluginLimitsProps): React.ReactElement {
  const unlimited = t('adminPlans.unlimited');
  const disabled = t('pluginsInstall.planForm.disabled');
  return (
    <div>
      <span className="text-foreground font-medium">{t('pluginsInstall.planForm.listLabel')}</span>:{' '}
      {t('pluginsInstall.planForm.listValue', {
        installs: formatPluginLimit(plan.maxInstalledPlugins, unlimited, disabled),
        servers: formatPluginLimit(plan.maxUserMcpServers, unlimited, disabled),
        calls: formatPluginLimit(plan.maxPluginCallsPerDay, unlimited, disabled),
      })}
    </div>
  );
}
