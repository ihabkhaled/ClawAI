import type { ReactElement } from 'react';

import { WORKSPACE_RISK_LABEL_STYLES } from '@/constants/workspace-risk-badge.constants';
import type { RiskBadgeProps } from '@/types/automation-preference.types';

export function RiskBadge({ label, score, matchedPolicyName }: RiskBadgeProps): ReactElement {
  const style = WORKSPACE_RISK_LABEL_STYLES[label];
  const display = score === null || score === undefined ? label : `${label} · ${String(score)}`;
  const title =
    matchedPolicyName === null || matchedPolicyName === undefined
      ? `Risk: ${label}`
      : `Risk: ${label} · matched policy ${matchedPolicyName}`;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs ${style}`}
      title={title}
      aria-label={title}
    >
      {display}
    </span>
  );
}
