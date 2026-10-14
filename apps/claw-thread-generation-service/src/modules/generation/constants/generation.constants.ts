import { z } from 'zod';

import { ThreadGenerationStage } from '../../../generated/prisma';
import type { ReviewStageSpec } from '../types/generation-pipeline.types';
import { ReviewerRole } from '../types/reviewer-role.enum';

export const MAX_GENERATION_ROUNDS = 3;
/** Step code of a reply that was not the JSON the role asked for. */
export const OUTPUT_INVALID_CODE = 'OUTPUT_INVALID';
export const FORMAT_ATTEMPTS_PER_MODEL = 2;
export const MAX_GENERATION_ATTEMPTS = 3;
/**
 * Jobs one replica runs at once. It is also the broker prefetch: each running job holds one
 * unacked message, so a replica is never handed more work than it will start. Three keeps a
 * replica busy while one job waits on a slow model, without one process fanning out dozens of
 * long model streams.
 */
export const GENERATION_REPLICA_CONCURRENCY = 3;
/**
 * Jobs running across ALL replicas, one `thread_generation_worker_slots` row each. It must be at
 * least replicas x GENERATION_REPLICA_CONCURRENCY, or the surplus claims find no slot and wait
 * for the next sweep. Raising it needs a migration that inserts the new slot rows.
 */
export const GENERATION_WORKER_SLOT_COUNT = 6;
export const GENERATION_WORKER_SLOT_IDS: readonly string[] = Array.from(
  { length: GENERATION_WORKER_SLOT_COUNT },
  (_, index) => `threads-worker-${String(index + 1)}`,
);
/**
 * Jobs of one owner running at once. A user who queues a dozen jobs holds at most this many
 * slots, so the rest of the slots stay available to other users.
 */
export const GENERATION_OWNER_MAX_RUNNING = 2;
/** Jobs the recovery pass re-publishes per interval, taken one per owner per round. */
export const GENERATION_DISPATCH_BATCH = 10;
/** Extra time past a lease before a job with no owner or no heartbeat is treated as abandoned. */
export const GENERATION_STALE_GRACE_MS = 5 * 60_000;
/** A job that waited this long in the queue (since it was last made runnable) is expired. */
export const GENERATION_QUEUE_MAX_AGE_MS = 3 * 60 * 60_000;
export const GENERATION_STALE_BATCH = 20;
/** Terminal jobs whose budget close the recovery pass tries per interval. */
export const GENERATION_CLOSURE_BATCH = 10;
export const BUDGET_CLOSE_MAX_ATTEMPTS = 8;
export const BUDGET_CLOSE_BASE_DELAY_MS = 15_000;
export const BUDGET_CLOSE_MAX_DELAY_MS = 30 * 60_000;
/** `budgetCloseStatus` of a job whose close was given up on; the budget is left to its owner service. */
export const BUDGET_CLOSE_ABANDONED_STATUS = 'CLOSE_ABANDONED';
/** Wait before the next budget close try after `failures` failures: 15 s doubling up to 30 min. */
export const budgetCloseDelayMs = (failures: number): number =>
  Math.min(BUDGET_CLOSE_BASE_DELAY_MS * 2 ** Math.max(0, failures - 1), BUDGET_CLOSE_MAX_DELAY_MS);
export const GENERATION_LEASE_MS = 90_000;
export const GENERATION_HEARTBEAT_MS = 20_000;
export const GENERATION_DISPATCH_LEASE_MS = 30_000;
export const GENERATION_RECOVERY_INTERVAL_MS = 15_000;
/** How often a running job looks for a cancel request, so an in-flight model call stops within ~2 s. */
export const CANCEL_POLL_INTERVAL_MS = 2_000;
/**
 * Time budget of one job attempt (25 min). The broker drops a consumer that holds a message
 * longer than 30 min and redelivers it while the first worker still runs, which would pay
 * for the same calls twice, so an attempt must end well inside that.
 */
export const GENERATION_ATTEMPT_MAX_MS = 25 * 60_000;
export const generationRetryDelayMs = (attempt: number): number =>
  Math.min(15_000 * 2 ** Math.max(0, attempt - 1), 120_000);
export const MIN_JUDGE_SCORE = 80;
export const MIN_CRITIC_SCORE = 75;
export const JUDGE_STAGE: ReviewStageSpec = {
  reviewer: ReviewerRole.JUDGE,
  stage: ThreadGenerationStage.JUDGE,
  minScore: MIN_JUDGE_SCORE,
};
export const CRITIC_STAGE: ReviewStageSpec = {
  reviewer: ReviewerRole.CRITIC,
  stage: ThreadGenerationStage.CRITIC,
  minScore: MIN_CRITIC_SCORE,
};
export const GENERATION_WORKER_ID = `thread-generation-${process.pid}`;
export const GENERATION_EVENT_SCHEMA_MAX_CORRELATION_LENGTH = 200;
export const generationEventSchema = z.object({
  jobId: z.string().min(1).max(64),
  correlationId: z.string().min(1).max(GENERATION_EVENT_SCHEMA_MAX_CORRELATION_LENGTH),
});

/** Upper bound on `{` positions tried when looking for JSON inside a prose-wrapped model reply. */
export const MODEL_JSON_MAX_OBJECT_STARTS = 50;

// Characters the model-JSON scanner reads; the byte order mark some providers prepend is code 0xFEFF.
export const JSON_OPEN_BRACE = '{';
export const JSON_CLOSE_BRACE = '}';
export const JSON_QUOTE = '"';
export const JSON_BACKSLASH = String.fromCharCode(92);
export const UTF8_BYTE_ORDER_MARK_CODE = 0xfeff;

/** Stray superscript or subscript tags models wrap around citations. */
export const STRAY_SCRIPT_TAG_PATTERN = /<\/?(?:sup|sub)\b[^<>]*>/giu;
export const CITATION_SEPARATOR_PATTERN = /^[\s,;]*/u;

/** Lead of the repair note appended to the second ask after an unusable reply, and its length cap. */
export const REPAIR_NOTE_LEAD =
  ' Your previous reply was refused. Answer again with only the requested JSON object. Reason: ';
export const REPAIR_NOTE_MAX_CHARS = 400;

/** Citation markers `[id]`, `[id1, id2]` and `[[id]]` in an author draft, and their id separator. */
export const CITATION_MARKER_PATTERN = /\[\[?\s*([^[\]\n]{4,200}?)\s*\]\]?/gu;
export const CITATION_ID_SPLIT_PATTERN = /\s*[,;]\s*/u;
/** A running job's spend is copied from its budget at most this often (per job). */
export const SPEND_SYNC_MIN_INTERVAL_MS = 5000;
/** Throttle entries kept before the finished ones are pruned. */
export const SPEND_SYNC_MAP_MAX_ENTRIES = 256;
