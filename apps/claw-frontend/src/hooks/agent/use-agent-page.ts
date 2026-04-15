import { TerminalCommandStatus } from '../../enums';

import { useApproveCommand, useRejectCommand } from './use-agent-command-mutations';
import { useAgentCommands } from './use-agent-commands';
import { useAgentSessions } from './use-agent-sessions';

export function useAgentPage() {
  const {
    data: sessionsData,
    isLoading,
    isError,
    error,
  } = useAgentSessions({ page: 1, pageSize: 20 });
  const { data: commandsData, isLoading: isCommandsLoading } = useAgentCommands({
    page: 1,
    pageSize: 20,
    status: TerminalCommandStatus.PENDING_APPROVAL,
  });
  const approveMutation = useApproveCommand();
  const rejectMutation = useRejectCommand();

  const sessions = sessionsData?.data ?? [];
  const commands = commandsData?.data ?? [];

  function handleApprove(commandId: string): void {
    void approveMutation.mutate(commandId);
  }

  function handleReject(commandId: string, reason: string): void {
    void rejectMutation.mutate({ id: commandId, dto: { reason } });
  }

  return {
    sessions,
    commands,
    isLoading,
    isCommandsLoading,
    isError,
    error,
    handleApprove,
    handleReject,
    isApproving: approveMutation.isPending,
    isRejecting: rejectMutation.isPending,
    isCommandActionPending: approveMutation.isPending || rejectMutation.isPending,
  };
}
