'use client';

import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { ReactElement } from 'react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
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
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.activity')} description={t('agent.activityDesc')} />
        <div className="flex flex-1 items-center justify-center">
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
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('agent.activity')} description={t('agent.activityDesc')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && totalRecent === 0 && pending.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Activity}
            title={t('agent.noCommands')}
            description={t('agent.activityDesc')}
          />
        </div>
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
              <CheckCircle2 className="size-4 text-green-500" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('agent.autoApproved')}</span>
                <span className="text-lg font-semibold">{okCount}</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="size-4 text-destructive" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">{t('agent.denied')}</span>
                <span className="text-lg font-semibold">{badCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!isLoading && totalRecent > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('agent.recentCommands')}</h2>
          {recent.slice(0, 30).map((inv) => (
            <Card key={inv.id}>
              <CardContent className="flex items-center gap-3 py-2">
                <Badge
                  variant={TERMINAL_OK.has(inv.status) ? 'default' : 'destructive'}
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
