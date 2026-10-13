import { Badge } from '@/components/ui/badge';
import { PLUGIN_RISK_BADGE_VARIANTS, PLUGIN_RISK_LABEL_KEYS } from '@/constants/plugins.constants';
import type { PluginRiskBadgeProps } from '@/types/plugins.types';

/** The highest-risk tool a plugin ships: read-only, can change things, or can delete. */
export function PluginRiskBadge({ risk, t }: PluginRiskBadgeProps): React.ReactElement {
  return (
    <Badge variant={PLUGIN_RISK_BADGE_VARIANTS[risk]} data-testid="plugin-risk-badge">
      {t(PLUGIN_RISK_LABEL_KEYS[risk])}
    </Badge>
  );
}
