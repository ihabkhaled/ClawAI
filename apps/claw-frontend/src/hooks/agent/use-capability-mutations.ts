import { useMutation, useQueryClient } from '@tanstack/react-query';

import {
  approveCapability,
  cancelCapability,
  proposeCapability,
  rejectCapability,
  rollbackCapability,
} from '../../repositories/agent/capability.repository';
import { queryKeys } from '../../repositories/shared/query-keys';
import type {
  CancelCapabilityRequest,
  ProposeCapabilityRequest,
  RejectCapabilityRequest,
  RollbackCapabilityRequest,
} from '../../types/capability.types';

export function useProposeCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ProposeCapabilityRequest) => proposeCapability(dto),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.lists() });
    },
  });
}

export function useApproveCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => approveCapability(id),
    onSuccess: (_data, id) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.detail(id) });
    },
  });
}

export function useRejectCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: RejectCapabilityRequest }) =>
      rejectCapability(id, dto),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.detail(id) });
    },
  });
}

export function useCancelCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: CancelCapabilityRequest }) =>
      cancelCapability(id, dto),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.detail(id) });
    },
  });
}

export function useRollbackCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto?: RollbackCapabilityRequest }) =>
      rollbackCapability(id, dto),
    onSuccess: (_data, { id }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.lists() });
      void qc.invalidateQueries({ queryKey: queryKeys.agentCapabilities.detail(id) });
    },
  });
}
