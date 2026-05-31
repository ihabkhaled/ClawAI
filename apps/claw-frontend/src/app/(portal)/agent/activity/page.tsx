'use client';

import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { AgentActivityEntry } from '@/components/agent/activity-entry';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent } from '@/components/ui/card';
import {
  TERMINAL_BAD_STATUSES as TERMINAL_BAD,
  TERMINAL_OK_STATUSES as TERMINAL_OK,
} from '@/constants/agent-activity.constants';
import { useAgentCapabilitiesPage } from '@/hooks/agent/use-agent-capabilities-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentActivityPage(): ReactElement {
  const { t } = useTranslation();
  const { pending, recent, isLoading, isError, error } = useAgentCapabilitiesPage();

  if (isError) {
    return (
      <div>
        <PageHeader title={t('agent.activity')} description={t('agent.activityDesc')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  const okCount = recent.filter((r) => TERMINAL_OK.has(r.status)).length;
  const badCount = recent.filter((r) => TERMINAL_BAD.has(r.status)).length;
  const totalRecent = recent.length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('agent.activity')} description={t('agent.activityDesc')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && totalRecent === 0 && pending.length === 0 && (
        <EmptyState
          icon={Activity}
          title={t('agent.noCommands')}
          description={t('agent.activityDesc')}
        />
      )}

      {!isLoading && (totalRecent > 0 || pending.length > 0) && (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <Activity className="size-4 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('agent.pendingApproval')}</span>
                <span className="text-lg font-semibold">{pending.length}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <CheckCircle2 className="size-4 text-[hsl(var(--accent-teal))]" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('agent.autoApproved')}</span>
                <span className="text-lg font-semibold">{okCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="size-4 text-[hsl(var(--accent-rose))]" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('agent.denied')}</span>
                <span className="text-lg font-semibold">{badCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && totalRecent > 0 && (
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{t('agent.recentCommands')}</h2>
          {recent.slice(0, 30).map((inv) => (
            <AgentActivityEntry key={inv.id} t={t} invocation={inv} />
          ))}
        </div>
      )}
    </div>
  );
}
