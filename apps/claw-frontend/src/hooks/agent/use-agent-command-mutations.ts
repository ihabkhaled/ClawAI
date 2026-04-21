import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  approveCommand,
  cancelCommand,
  createCommand,
  rejectCommand,
} from '../../repositories/agent/agent.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type {
  CancelCommandRequest,
  CreateCommandRequest,
  RejectCommandRequest,
} from '../../types/agent.types';

export function useCreateCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCommandRequest) => createCommand(dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentCommands.all });
    },
  });
}

export function useApproveCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveCommand(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentCommands.all });
    },
  });
}

export function useRejectCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectCommandRequest }) => rejectCommand(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentCommands.all });
    },
  });
}

export function useCancelCommand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: CancelCommandRequest }) => cancelCommand(id, dto),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.agentCommands.all });
    },
  });
}
