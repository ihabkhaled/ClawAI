'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WORKSPACE_CHAIN_RUN_STATUS_VARIANT } from '@/constants/workspace-chain.constants';
import type { WorkspaceChainRunStatus } from '@/enums/workspace-chain-run-status.enum';
import type { ChainRowProps } from '@/types';

export function ChainRow({
  chain,
  onRun,
  onViewRuns,
  isRunPending,
  lastRunView,
  t,
}: ChainRowProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{chain.name}</span>
          {!chain.isEnabled ? (
            <Badge variant="outline" className="text-xs">
              {t('workspaceChains.chain.disabled')}
            </Badge>
          ) : null}
        </div>
        {chain.description !== null ? (
          <p className="text-muted-foreground text-xs">{chain.description}</p>
        ) : null}
        <p className="text-muted-foreground text-xs">
          {t('workspaceChains.chain.stepCount', { value: String(chain.dsl.steps.length) })}
        </p>
        {lastRunView !== null ? (
          <div className="flex items-center gap-2 text-xs">
            <Badge
              variant={
                WORKSPACE_CHAIN_RUN_STATUS_VARIANT[lastRunView.status as WorkspaceChainRunStatus] ??
                'outline'
              }
              className="text-xs"
            >
              {lastRunView.status}
            </Badge>
            {lastRunView.wasResumed ? (
              <span className="text-muted-foreground">{t('workspaceChains.chain.wasResumed')}</span>
            ) : null}
            {lastRunView.error !== null ? (
              <span className="text-destructive">{lastRunView.error}</span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button size="sm" variant="outline" onClick={() => onViewRuns(chain.id)}>
          {t('workspaceChains.chain.viewRuns')}
        </Button>
        <Button
          size="sm"
          onClick={() => onRun(chain.id)}
          disabled={isRunPending || !chain.isEnabled}
        >
          {isRunPending ? t('workspaceChains.chain.running') : t('workspaceChains.chain.run')}
        </Button>
      </div>
    </div>
  );
}
