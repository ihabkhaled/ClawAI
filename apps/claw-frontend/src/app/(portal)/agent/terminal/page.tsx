'use client';

import { CheckCircle, Clock, Terminal, XCircle } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TerminalCommandStatus } from '@/enums';
import { useAgentTerminalPage } from '@/hooks/agent/use-agent-terminal-page';
import { useTranslation } from '@/lib/i18n';

export default function AgentTerminalPage(): React.ReactElement {
  const { t } = useTranslation();
  const {
    pendingCommands,
    recentCommands,
    isLoading,
    isError,
    error,
    handleApprove,
    handleReject,
    isApproving,
  } = useAgentTerminalPage();

  if (isError) {
    return (
      <div className="flex h-full flex-col">
        <PageHeader title={t('agent.terminal')} description={t('agent.terminalDesc')} />
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  const total = pendingCommands.length + recentCommands.length;

  return (
    <div className="flex h-full flex-col gap-6">
      <PageHeader title={t('agent.terminal')} description={t('agent.terminalDesc')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && total === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <EmptyState
            icon={Terminal}
            title={t('agent.noCommands')}
            description={t('agent.noCommandsDesc')}
          />
        </div>
      )}

      {!isLoading && pendingCommands.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-yellow-500" />
            {t('agent.pendingApproval')} ({pendingCommands.length})
          </h2>
          {pendingCommands.map((cmd) => (
            <Card key={cmd.id} className="border-yellow-300/50">
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-4">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {cmd.command}
                  </code>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      disabled={isApproving}
                      onClick={() => handleApprove(cmd.id)}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50"
                    >
                      <CheckCircle className="size-3" />
                      {t('agent.approve')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(cmd.id, t('agent.rejectedByUser'))}
                      className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <XCircle className="size-3" />
                      {t('agent.reject')}
                    </button>
                  </div>
                </div>
                {cmd.workingDir !== null && (
                  <p className="text-xs text-muted-foreground">{cmd.workingDir}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && recentCommands.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold">{t('agent.recentCommands')}</h2>
          {recentCommands.map((cmd) => (
            <Card key={cmd.id}>
              <CardContent className="flex items-center gap-3 py-2">
                <Badge
                  variant={
                    cmd.status === TerminalCommandStatus.EXECUTED ? 'default' : 'destructive'
                  }
                  className="shrink-0 text-xs"
                >
                  {cmd.status}
                </Badge>
                <code className="flex-1 truncate text-xs text-muted-foreground">{cmd.command}</code>
                {cmd.exitCode !== null && (
                  <span className="text-xs text-muted-foreground">exit {cmd.exitCode}</span>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
