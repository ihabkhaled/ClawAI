import { SESSION_HEARTBEAT_TIMEOUT_SECONDS } from '../../../common/constants/agent.constants';
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
  runnerCompliance: true,
  runnerComplianceReason: true,
} satisfies Prisma.AgentSessionSelect;

/**
 * F100: a runner whose last heartbeat is older than this receives no new job,
 * even before the session sweeper marks it EXPIRED.
 */
export const RUNNER_HEARTBEAT_TTL_SECONDS = SESSION_HEARTBEAT_TIMEOUT_SECONDS;

/** F100 runner credential: a recognisable prefix, 256 random bits. */
export const RUNNER_TOKEN_PREFIX = 'clwr_';
export const RUNNER_TOKEN_BYTES = 32;

/** Characters after the prefix kept in clear so an owner can tell tokens apart. */
export const RUNNER_TOKEN_VISIBLE_CHARS = 6;

/** Recorded on a PROMPT job: the portal never approves a prompt's tool calls. */
export const PROMPT_JOB_APPROVAL_NOTE =
  'Prompt routine: each tool call is approved on the runner under its local policy.';

/** F099 prompt routine limits, checked again by the runner. */
export const PROMPT_ROUTINE_MAX_CHARS = 8000;
export const PROMPT_ROUTINE_MODEL_MAX = 128;
export const PROMPT_ROUTINE_REPO_REF_MAX = 200;
