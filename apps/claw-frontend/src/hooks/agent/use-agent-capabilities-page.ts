import { CapabilityInvocationStatus } from '../../enums';
import type { CapabilityInvocation } from '../../types/capability.types';

import {
  useApproveCapability,
  useCancelCapability,
  useRejectCapability,
} from './use-capability-mutations';
import { useCapabilityQueue } from './use-capability-queue';


type UseAgentCapabilitiesPageReturn = {
  pending: CapabilityInvocation[];
  recent: CapabilityInvocation[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  handleApprove: (id: string) => void;
  handleReject: (id: string, reason: string) => void;
  handleCancel: (id: string) => void;
  isApproving: boolean;
};

export function useAgentCapabilitiesPage(): UseAgentCapabilitiesPageReturn {
  const { data, isLoading, isError, error } = useCapabilityQueue({ page: 1, pageSize: 50 });
  const approveMutation = useApproveCapability();
  const rejectMutation = useRejectCapability();
  const cancelMutation = useCancelCapability();

  const all = data?.data ?? [];
  const pending = all.filter((c) => c.status === CapabilityInvocationStatus.PENDING_APPROVAL);
  const recent = all.filter((c) => c.status !== CapabilityInvocationStatus.PENDING_APPROVAL);

  function handleApprove(id: string): void {
    approveMutation.mutate(id);
  }
  function handleReject(id: string, reason: string): void {
    rejectMutation.mutate({ id, dto: { reason } });
  }
  function handleCancel(id: string): void {
    cancelMutation.mutate({ id, dto: { reason: 'cancelled by user' } });
  }

  return {
    pending,
    recent,
    isLoading,
    isError,
    error,
    handleApprove,
    handleReject,
    handleCancel,
    isApproving: approveMutation.isPending,
  };
}
