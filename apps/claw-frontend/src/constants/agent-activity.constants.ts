import { CapabilityInvocationStatus } from '@/enums';

export const TERMINAL_OK_STATUSES = new Set<CapabilityInvocationStatus>([
  CapabilityInvocationStatus.EXECUTED,
  CapabilityInvocationStatus.AUTO_APPROVED,
]);

export const TERMINAL_BAD_STATUSES = new Set<CapabilityInvocationStatus>([
  CapabilityInvocationStatus.FAILED,
  CapabilityInvocationStatus.DENIED,
  CapabilityInvocationStatus.REJECTED,
  CapabilityInvocationStatus.EXPIRED,
  CapabilityInvocationStatus.CANCELLED,
  CapabilityInvocationStatus.ROLLBACK_FAILED,
]);
