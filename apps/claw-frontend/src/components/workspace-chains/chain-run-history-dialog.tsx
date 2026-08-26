'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { WORKSPACE_CHAIN_RUN_STATUS_VARIANT } from '@/constants/workspace-chain.constants';
import { WorkspaceChainRunStatus } from '@/enums/workspace-chain-run-status.enum';
import type { ChainRunHistoryDialogProps } from '@/types';

export function ChainRunHistoryDialog({
  open,
  runs,
  isLoading,
  onClose,
  onResume,
  isResumePending,
  t,
}: ChainRunHistoryDialogProps): React.ReactElement {
  const handleOpenChange = (next: boolean): void => {
    if (!next) {
      onClose();
    }
  };

  let body: React.ReactElement;
  if (isLoading) {
    body = (
      <p className="text-muted-foreground text-sm">{t('workspaceChains.runHistory.loading')}</p>
    );
  } else if (runs.length === 0) {
    body = <p className="text-muted-foreground text-sm">{t('workspaceChains.runHistory.empty')}</p>;
  } else {
    body = (
      <div className="flex flex-col gap-3">
        {runs.map((run) => (
          <div key={run.id} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    WORKSPACE_CHAIN_RUN_STATUS_VARIANT[run.status as WorkspaceChainRunStatus] ??
                    'outline'
                  }
                  className="text-xs"
                >
                  {run.status}
                </Badge>
                {run.wasResumed ? (
                  <Badge variant="outline" className="text-xs">
                    {t('workspaceChains.chain.wasResumed')}
                  </Badge>
                ) : null}
              </div>
              {run.status === WorkspaceChainRunStatus.FAILED ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResume(run.id)}
                  disabled={isResumePending}
                >
                  {isResumePending
                    ? t('workspaceChains.runHistory.resuming')
                    : t('workspaceChains.runHistory.resume')}
                </Button>
              ) : null}
            </div>
            {run.error !== null ? <p className="text-destructive text-xs">{run.error}</p> : null}
            <p className="text-muted-foreground text-xs">
              {run.startedAt !== null
                ? new Date(run.startedAt).toLocaleString()
                : t('workspaceChains.runHistory.notStarted')}
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('workspaceChains.runHistory.title')}</DialogTitle>
        </DialogHeader>

        {body}
      </DialogContent>
    </Dialog>
  );
}
