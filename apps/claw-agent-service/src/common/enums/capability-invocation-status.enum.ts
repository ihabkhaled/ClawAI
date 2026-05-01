// 12-state lifecycle for a CapabilityInvocation. Mirrors the prisma enum.
// Initial: PENDING_APPROVAL (or AUTO_APPROVED / DENIED if a system-default
// policy already matched at draft time). Terminal: EXECUTED, FAILED,
// REJECTED, EXPIRED, CANCELLED, ROLLED_BACK, ROLLBACK_FAILED, DENIED.
export enum CapabilityInvocationStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  AUTO_APPROVED = 'AUTO_APPROVED',
  APPROVED = 'APPROVED',
  EXECUTING = 'EXECUTING',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  ROLLED_BACK = 'ROLLED_BACK',
  ROLLBACK_FAILED = 'ROLLBACK_FAILED',
  DENIED = 'DENIED',
}
