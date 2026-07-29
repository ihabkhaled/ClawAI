'use client';

import { CheckCircle, Clock, Terminal, XCircle } from 'lucide-react';

import { TerminalOutputBlock } from '@/components/agent/terminal-output-block';
import { EmptyState } from '@/components/common/empty-state';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <div>
        <PageHeader title={t('agent.terminal')} description={t('agent.terminalDesc')} />
        <div className="flex items-center justify-center py-12">
          <p className="text-destructive text-sm">
            {error instanceof Error ? error.message : t('agent.loadFailed')}
          </p>
        </div>
      </div>
    );
  }

  const total = pendingCommands.length + recentCommands.length;

  return (
    <div className="space-y-6">
      <PageHeader title={t('agent.terminal')} description={t('agent.terminalDesc')} />

      {isLoading && <LoadingSpinner label={t('agent.loading')} />}

      {!isLoading && total === 0 && (
        <EmptyState
          icon={Terminal}
          title={t('agent.noCommands')}
          description={t('agent.noCommandsDesc')}
        />
      )}

      {!isLoading && pendingCommands.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4 text-[hsl(var(--accent-amber))]" />
            {t('agent.pendingApproval')} ({pendingCommands.length})
          </h2>
          {pendingCommands.map((cmd) => (
            <Card key={cmd.id} className="border-[hsl(var(--accent-amber)/0.4)]">
              <CardContent className="flex flex-col gap-3 py-3">
                <TerminalOutputBlock command={cmd} />
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    disabled={isApproving}
                    onClick={() => handleApprove(cmd.id)}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.1)]"
                  >
                    <CheckCircle className="size-3" />
                    {t('agent.approve')}
                  </Button>
                  <Button
                    variant="unstyled"
                    size="unstyled"
                    type="button"
                    onClick={() => handleReject(cmd.id, t('agent.rejectedByUser'))}
                    className="text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                  >
                    <XCircle className="size-3" />
                    {t('agent.reject')}
                  </Button>
                </div>
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
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      cmd.status === TerminalCommandStatus.EXECUTED ? 'default' : 'destructive'
                    }
                    className="shrink-0 text-xs"
                  >
                    {cmd.status}
                  </Badge>
                  {cmd.exitCode !== null && (
                    <span className="text-muted-foreground text-xs">exit {cmd.exitCode}</span>
                  )}
                </div>
                <TerminalOutputBlock command={cmd} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
