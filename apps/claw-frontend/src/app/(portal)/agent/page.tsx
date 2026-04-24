'use client';

import { Bot, Monitor, Terminal } from 'lucide-react';

import { RiskBadge } from '@/components/agent/risk-badge';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AgentSessionStatus } from '@/enums';
import { useAgentPage } from '@/hooks/agent/use-agent-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentPage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    sessions,
    commands,
    isLoading,
    isError,
    error,
    handleApprove,
    handleReject,
    isCommandActionPending,
  } = useAgentPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.title')} description={t('agent.description')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('agent.title')} description={t('agent.description')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && sessions.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Bot}
            title={t('agent.noSessions')}
            description={t('agent.noSessionsDesc')}
          />
        </div>
      )}

      {!isLoading && sessions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Monitor className="size-4" />
                    {session.hostname}
                  </span>
                  <Badge
                    variant={
                      session.status === AgentSessionStatus.CONNECTED ? 'default' : 'secondary'
                    }
                  >
                    {session.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                <p>{session.platform}</p>
                <p>
                  {t('agent.version')}: {session.agentVersion}
                </p>
                {session._count !== undefined && (
                  <p>
                    {session._count.commands} {t('agent.commands')} · {session._count.repos}{' '}
                    {t('agent.repos')}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && commands.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Terminal className="size-4" />
            {t('agent.pendingCommands')}
          </h2>
          {commands.map((cmd) => (
            <Card key={cmd.id} className="border-warning/30">
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex flex-1 flex-col gap-1 overflow-hidden">
                  <code className="truncate text-xs">{cmd.command}</code>
                  {cmd.riskReasons !== null && cmd.riskReasons.length > 0 ? (
                    <span className="truncate text-[10px] text-muted-foreground">
                      {cmd.riskReasons}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <RiskBadge label={cmd.riskLabel} score={cmd.riskScore} />
                  <button
                    type="button"
                    disabled={isCommandActionPending}
                    onClick={() => handleApprove(cmd.id)}
                    className="rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                  >
                    {t('agent.approve')}
                  </button>
                  <button
                    type="button"
                    disabled={isCommandActionPending}
                    onClick={() => handleReject(cmd.id, t('agent.rejectedByUser'))}
                    className="rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    {t('agent.reject')}
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
