'use client';

import { Clock, Shield } from 'lucide-react';
import type { ReactElement } from 'react';

import { CapabilityCard } from '@/components/agent/capability-card';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
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
      <div>
        <PageHeader title={t('agent.capabilities')} description={t('agent.capabilitiesDesc')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  const total = pending.length + recent.length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('agent.capabilities')} description={t('agent.capabilitiesDesc')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && total === 0 && (
        <EmptyState
          icon={Shield}
          title={t('agent.noCommands')}
          description={t('agent.capabilitiesDesc')}
        />
      )}

      {!isLoading && pending.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-[hsl(var(--accent-amber))]" />
            {t('agent.pendingApproval')} ({pending.length})
          </h2>
          {pending.map((inv) => (
            <CapabilityCard
              key={inv.id}
              t={t}
              invocation={inv}
              isApproving={isApproving}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {!isLoading && recent.length > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t('agent.recentCommands')}</h2>
          {recent.map((inv) => (
            <CapabilityCard
              key={inv.id}
              t={t}
              invocation={inv}
              isApproving={isApproving}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}
    </div>
  );
}
