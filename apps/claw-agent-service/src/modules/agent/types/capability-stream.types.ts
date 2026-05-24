/**
 * V2 Stream 08 — SSE event-bus types.
 */

export type CapabilityStreamEventType =
  | 'proposed'
  | 'auto_approved'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'executed'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'rolled_back'
  | 'denied';

export type CapabilityStreamEvent = {
  type: CapabilityStreamEventType;
  invocationId: string;
  userId: string;
  deviceId: string | null;
  capabilityClass: string | null;
  capabilityOperation: string | null;
  timestamp: string;
};

export type BulkApproveResult = {
  approved: string[];
  failed: Array<{ id: string; reason: string }>;
};
