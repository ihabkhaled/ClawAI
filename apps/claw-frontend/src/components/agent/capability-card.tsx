'use client';

import type { ReactElement } from 'react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
  SEVERITY_ICON_MAP,
  SEVERITY_STYLES,
  STATUS_TO_SEVERITY,
} from '@/constants/agent-activity-severity.constants';
import { CapabilityInvocationStatus } from '@/enums';
import { cn } from '@/lib/utils';
import type { CapabilityCardProps } from '@/types/agent-component.types';

export function CapabilityCard({
  t,
  invocation,
  isApproving,
  onApprove,
  onReject,
}: CapabilityCardProps): ReactElement {
  const severity = STATUS_TO_SEVERITY[invocation.status];
  const styles = SEVERITY_STYLES[severity];
  const Icon = SEVERITY_ICON_MAP[severity];
  const isPending = invocation.status === CapabilityInvocationStatus.PENDING_APPROVAL;
  const switchId = `capability-switch-${invocation.id}`;

  function handleToggle(next: boolean): void {
    if (next) {
      onApprove(invocation.id);
    } else {
      onReject(invocation.id, t('agent.rejectedByUser'));
    }
  }

  return (
    <Card className={cn('overflow-hidden border-border', styles.bgClass)}>
      <div className="flex">
        <div className={cn('w-[3px] shrink-0', styles.accentClass)} aria-hidden="true" />
        <CardContent className="flex flex-1 flex-col gap-3 py-3">
          <div className="flex items-center gap-3">
            <Icon aria-hidden="true" className={cn('size-4 shrink-0', styles.iconClass)} />
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {invocation.capabilityClass}.{invocation.capabilityOperation}
            </Badge>
            <RiskBadge label={invocation.riskLabel} score={invocation.riskScore} />
            <div className="flex-1" />
            {isPending ? (
              <label
                htmlFor={switchId}
                className="flex shrink-0 cursor-pointer items-center gap-2 text-xs font-medium"
              >
                <span className="text-muted-foreground">{t('agent.approve')}</span>
                <Switch
                  id={switchId}
                  checked={false}
                  onCheckedChange={handleToggle}
                  disabled={isApproving}
                />
              </label>
            ) : (
              <Badge
                variant="outline"
                className="shrink-0 text-[10px] uppercase tracking-wider"
              >
                {invocation.status}
              </Badge>
            )}
          </div>
          <code className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
            {JSON.stringify(invocation.targetDescriptor)}
          </code>
          {invocation.matchedPolicyName !== null && (
            <p className="text-xs text-muted-foreground">
              {t('agent.matchedPolicy')}: {invocation.matchedPolicyName}
            </p>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
