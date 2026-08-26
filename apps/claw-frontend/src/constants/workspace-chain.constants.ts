import { WorkspaceChainRunStatus } from '@/enums/workspace-chain-run-status.enum';

export const WORKSPACE_CHAIN_RUN_STATUS_VARIANT: Record<
  WorkspaceChainRunStatus,
  'default' | 'secondary' | 'destructive' | 'outline'
> = {
  [WorkspaceChainRunStatus.COMPLETED]: 'default',
  [WorkspaceChainRunStatus.RUNNING]: 'secondary',
  [WorkspaceChainRunStatus.PENDING]: 'outline',
  [WorkspaceChainRunStatus.FAILED]: 'destructive',
};
