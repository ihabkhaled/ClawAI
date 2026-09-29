import type { Prisma } from '../../../generated/prisma';

/**
 * F100 — self-hosted runners.
 *
 * A runner is an agent session whose metadata carries the runner marker. No
 * table of its own: registration, heartbeat, expiry and command execution are
 * the session and TerminalCommand lifecycles that already exist.
 */
export const RUNNER_METADATA_KIND = 'runner';

/** A runner claims one job per call so a crashed runner strands at most one. */
export const RUNNER_CLAIM_LIMIT = 1;

/** Upper bound on runners returned to one owner. */
export const RUNNER_LIST_LIMIT = 100;

export const RUNNER_LABEL_MAX = 16;

/** Runner projection: never selects `sessionKey`, so a listing cannot leak it. */
export const RUNNER_SELECT = {
  id: true,
  userId: true,
  hostname: true,
  platform: true,
  agentVersion: true,
  status: true,
  lastHeartbeatAt: true,
  metadata: true,
} satisfies Prisma.AgentSessionSelect;
