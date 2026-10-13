import { z } from 'zod';

import { ThreadGenerationStage } from '../../../generated/prisma';
import type { ReviewStageSpec } from '../types/generation-pipeline.types';
import { ReviewerRole } from '../types/reviewer-role.enum';

export const MAX_GENERATION_ROUNDS = 3;
export const FORMAT_ATTEMPTS_PER_MODEL = 2;
export const MAX_GENERATION_ATTEMPTS = 3;
export const GENERATION_WORKER_SLOT_IDS = ['threads-worker-1', 'threads-worker-2'] as const;
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
