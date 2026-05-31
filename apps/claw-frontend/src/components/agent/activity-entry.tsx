'use client';

import { ChevronDown } from 'lucide-react';
import { type ReactElement, useState } from 'react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { Badge } from '@/components/ui/badge';
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
    <Card className={cn('overflow-hidden border-border', styles.bgClass)}>
      {/* 3px accent rule on the left edge — color comes from the --accent-* token */}
      <div className="flex">
        <div className={cn('w-[3px] shrink-0', styles.accentClass)} aria-hidden="true" />
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            aria-controls={entryId}
            className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon aria-hidden="true" className={cn('size-4 shrink-0', styles.iconClass)} />
            <Badge variant="outline" className="shrink-0 font-mono text-xs">
              {invocation.capabilityClass}.{invocation.capabilityOperation}
            </Badge>
            <code className="flex-1 truncate text-xs text-muted-foreground">
              {JSON.stringify(invocation.targetDescriptor)}
            </code>
            <RiskBadge label={invocation.riskLabel} score={invocation.riskScore} />
            <Badge
              variant="outline"
              className="shrink-0 text-[10px] uppercase tracking-wider"
            >
              {invocation.status}
            </Badge>
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-4 shrink-0 text-muted-foreground transition-transform duration-fast ease-expo-out',
                expanded && 'rotate-180',
              )}
            />
          </button>
          {expanded && (
            <CardContent
              id={entryId}
              className="flex flex-col gap-2 border-t border-border/60 px-3 py-3 text-xs"
            >
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <span className="font-medium text-foreground">{t('agent.blastRadius')}</span>
                <span className="font-mono">{invocation.blastRadius}</span>
                <span className="font-medium text-foreground">{t('agent.reversibility')}</span>
                <span className="font-mono">{invocation.reversibility}</span>
                <span className="font-medium text-foreground">{t('agent.riskScore')}</span>
                <span className="font-mono">{invocation.riskScore}</span>
                {invocation.matchedPolicyName !== null && (
                  <>
                    <span className="font-medium text-foreground">
                      {t('agent.matchedPolicy')}
                    </span>
                    <span className="font-mono">{invocation.matchedPolicyName}</span>
                  </>
                )}
              </div>
              {invocation.executionError !== null && (
                <p className="rounded bg-[hsl(var(--accent-rose)/0.08)] px-2 py-1 font-mono text-[hsl(var(--accent-rose))]">
                  {invocation.executionError}
                </p>
              )}
              {invocation.rejectionReason !== null && (
                <p className="rounded bg-muted px-2 py-1 font-mono text-muted-foreground">
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
