import { TerminalCommandStatus } from '../../enums';

import { useApproveCommand, useRejectCommand } from './use-agent-command-mutations';
import { useAgentCommands } from './use-agent-commands';

export function useAgentTerminalPage() {
  const { data, isLoading, isError, error } = useAgentCommands({ page: 1, pageSize: 50 });
  const approveMutation = useApproveCommand();
  const rejectMutation = useRejectCommand();

  const allCommands = data?.data ?? [];
  const pendingCommands = allCommands.filter(
    (c) => c.status === TerminalCommandStatus.PENDING_APPROVAL,
  );
  const recentCommands = allCommands.filter(
    (c) => c.status !== TerminalCommandStatus.PENDING_APPROVAL,
  );

  function handleApprove(commandId: string): void {
    void approveMutation.mutate(commandId);
  }

  function handleReject(commandId: string, reason: string): void {
    void rejectMutation.mutate({ id: commandId, dto: { reason } });
  }

  return {
    pendingCommands,
    recentCommands,
    isLoading,
    isError,
    error,
    handleApprove,
    handleReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
  };
}
