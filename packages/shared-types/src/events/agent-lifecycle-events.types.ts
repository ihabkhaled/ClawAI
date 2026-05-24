/**
 * Desktop-Agent V2 Stream 01 — agent lifecycle event payloads.
 *
 * These 7 payload shapes correspond to events that have been published
 * by `claw-agent-service` since Phase A but had no typed consumer
 * contract. They are now consumed by `claw-audit-service` (added in
 * V2 Stream 01c) so every agent action lands in the audit Mongo
 * collection alongside the 12 capability events.
 *
 * Shapes mirror the actual producer-side publish calls in:
 *   - apps/claw-agent-service/src/modules/agent/services/agent-session.service.ts
 *   - apps/claw-agent-service/src/modules/agent/services/refresh.service.ts
 *   - apps/claw-agent-service/src/modules/agent/services/pairing.service.ts
 *   - apps/claw-agent-service/src/modules/agent/services/device-code.service.ts
 *   - apps/claw-agent-service/src/modules/agent/services/agent-command.service.ts
 *
 * All payloads include an ISO-8601 `timestamp` field appended by the
 * publisher's helper method (`publish` / `publishEvent`).
 */

export type AgentEventTimestamp = {
  timestamp: string;
};

export type AgentSessionConnectedPayload = AgentEventTimestamp & {
  sessionId: string;
  userId: string;
  /** present when the session was created via device-attached pairing */
  deviceId?: string;
};

export type AgentSessionDisconnectedPayload = AgentEventTimestamp & {
  sessionId: string;
  userId: string;
};

export type AgentDevicePairedPayload = AgentEventTimestamp & {
  deviceId: string;
  userId: string;
  scopes: string[];
  hostname: string;
  os?: string;
  platform?: string;
  agentVersion?: string;
};

export type AgentDeviceRevokedPayload = AgentEventTimestamp & {
  deviceId: string;
  userId: string;
  reason: string;
  /** present when revocation was triggered by a user (vs an internal subsystem) */
  revokedByUserId?: string;
};

export type AgentTokenRotatedPayload = AgentEventTimestamp & {
  deviceId: string;
  userId: string;
  oldJti: string;
  newJti: string;
  ipAddress?: string;
};

export type AgentTokenReuseDetectedPayload = AgentEventTimestamp & {
  deviceId: string;
  userId: string;
  presentedJti: string;
  ipAddress?: string;
};

export type AgentPolicyViolatedPayload = AgentEventTimestamp & {
  commandId: string;
  sessionId: string;
  userId: string;
  matchedPolicyId?: string;
  matchedPolicyName?: string;
  riskScore: number;
  riskLabel: string;
};

export type AgentLifecycleEventPayload =
  | AgentSessionConnectedPayload
  | AgentSessionDisconnectedPayload
  | AgentDevicePairedPayload
  | AgentDeviceRevokedPayload
  | AgentTokenRotatedPayload
  | AgentTokenReuseDetectedPayload
  | AgentPolicyViolatedPayload;
