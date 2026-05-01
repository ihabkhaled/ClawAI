'use client';

import { CheckCircle, Clock, Shield, XCircle } from 'lucide-react';
import type { ReactElement } from 'react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CapabilityInvocationStatus } from '@/enums';
import { useAgentCapabilitiesPage } from '@/hooks/agent/use-agent-capabilities-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentCapabilitiesPage(): ReactElement {
  const { t } = useTranslation();
  const {
    pending,
    recent,
    isLoading,
    isError,
    error,
    handleApprove,
    handleReject,
    isApproving,
  } = useAgentCapabilitiesPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.capabilities')} description={t('agent.capabilitiesDesc')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  const total = pending.length + recent.length;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('agent.capabilities')} description={t('agent.capabilitiesDesc')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && total === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Shield}
            title={t('agent.noCommands')}
            description={t('agent.capabilitiesDesc')}
          />
        </div>
      )}

      {!isLoading && pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-yellow-500" />
            {t('agent.pendingApproval')} ({pending.length})
          </h2>
          {pending.map((inv) => (
            <Card key={inv.id} className="border-yellow-300/50">
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex flex-1 flex-col gap-1 truncate">
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-mono">
                        {inv.capabilityClass}.{inv.capabilityOperation}
                      </Badge>
                      <RiskBadge label={inv.riskLabel} score={inv.riskScore} />
                    </div>
                    <code className="truncate rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {JSON.stringify(inv.targetDescriptor)}
                    </code>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={() => handleApprove(inv.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="size-3" />
                      {t('agent.approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(inv.id, t('agent.rejectedByUser'))}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-3" />
                      {t('agent.reject')}
                    </button>
                  </div>
                </div>
                {inv.matchedPolicyName !== null && (
                  <p className="text-xs text-muted-foreground">
                    {t('agent.matchedPolicy')}: {inv.matchedPolicyName}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && recent.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('agent.recentCommands')}</h2>
          {recent.map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex items-center gap-3 py-2">
                <Badge
                  variant={
                    inv.status === CapabilityInvocationStatus.EXECUTED ||
                    inv.status === CapabilityInvocationStatus.AUTO_APPROVED
                      ? 'default'
                      : 'destructive'
                  }
                  className="shrink-0 text-xs"
                >
                  {inv.status}
                </Badge>
                <Badge variant="outline" className="shrink-0 font-mono text-xs">
                  {inv.capabilityClass}.{inv.capabilityOperation}
                </Badge>
                <code className="flex-1 truncate text-xs text-muted-foreground">
                  {JSON.stringify(inv.targetDescriptor)}
                </code>
                <RiskBadge label={inv.riskLabel} score={inv.riskScore} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
