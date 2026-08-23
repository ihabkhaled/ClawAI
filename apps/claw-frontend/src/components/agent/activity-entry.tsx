'use client';

import { ChevronDown } from 'lucide-react';
import { type ReactElement, useState } from 'react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  SEVERITY_ICON_MAP,
  SEVERITY_STYLES,
  STATUS_TO_SEVERITY,
} from '@/constants/agent-activity-severity.constants';
import { cn } from '@/lib/utils';
import type { AgentActivityEntryProps } from '@/types/agent-component.types';

export function AgentActivityEntry({ t, invocation }: AgentActivityEntryProps): ReactElement {
  const [expanded, setExpanded] = useState(false);
  const severity = STATUS_TO_SEVERITY[invocation.status];
  const styles = SEVERITY_STYLES[severity];
  const Icon = SEVERITY_ICON_MAP[severity];
  const entryId = `activity-entry-${invocation.id}`;

  return (
    <Card className={cn('border-border max-w-full min-w-0 overflow-hidden', styles.bgClass)}>
      {/* 3px accent rule on the left edge — color comes from the --accent-* token */}
      <div className="flex">
        <div className={cn('w-[3px] shrink-0', styles.accentClass)} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <Button
            variant="unstyled"
            size="unstyled"
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls={entryId}
            className="hover:bg-muted/40 focus-visible:ring-ring touch:whitespace-normal flex w-full flex-wrap items-center gap-3 px-3 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none sm:flex-nowrap"
          >
            <Icon aria-hidden="true" className={cn('size-4 shrink-0', styles.iconClass)} />
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {invocation.capabilityClass}.{invocation.capabilityOperation}
            </Badge>
            <code className="text-muted-foreground touch:order-last touch:basis-full touch:break-all touch:whitespace-normal min-w-0 flex-1 truncate text-xs">
              {JSON.stringify(invocation.targetDescriptor)}
            </code>
            <RiskBadge label={invocation.riskLabel} score={invocation.riskScore} />
            <Badge
              variant="outline"
              className="touch:text-xs shrink-0 text-[10px] tracking-wider uppercase"
            >
              {invocation.status}
            </Badge>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'text-muted-foreground duration-fast ease-expo-out size-4 shrink-0 transition-transform',
                expanded && 'rotate-180',
              )}
            />
          </Button>
          {expanded && (
            <CardContent
              id={entryId}
              className="border-border/60 flex min-w-0 flex-col gap-2 border-t px-3 py-3 text-xs"
            >
              <div className="text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-foreground font-medium">{t('agent.blastRadius')}</span>
                <span className="font-mono">{invocation.blastRadius}</span>
                <span className="text-foreground font-medium">{t('agent.reversibility')}</span>
                <span className="font-mono">{invocation.reversibility}</span>
                <span className="text-foreground font-medium">{t('agent.riskScore')}</span>
                <span className="font-mono">{invocation.riskScore}</span>
                {invocation.matchedPolicyName !== null && (
                  <>
                    <span className="text-foreground font-medium">{t('agent.matchedPolicy')}</span>
                    <span className="font-mono break-all">{invocation.matchedPolicyName}</span>
                  </>
                )}
              </div>
              {invocation.executionError !== null && (
                <p className="rounded bg-[hsl(var(--accent-rose)/0.08)] px-2 py-1 font-mono break-all text-[hsl(var(--accent-rose))]">
                  {invocation.executionError}
                </p>
              )}
              {invocation.rejectionReason !== null && (
                <p className="bg-muted text-muted-foreground rounded px-2 py-1 font-mono break-all">
                  {invocation.rejectionReason}
                </p>
              )}
            </CardContent>
          )}
        </div>
      </div>
    </Card>
  );
}
