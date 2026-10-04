import { z } from 'zod';

export const MAX_GENERATION_ROUNDS = 3;
export const MAX_GENERATION_ATTEMPTS = 3;
export const GENERATION_WORKER_SLOT_IDS = ['threads-worker-1', 'threads-worker-2'] as const;
export const GENERATION_LEASE_MS = 90_000;
export const GENERATION_HEARTBEAT_MS = 20_000;
export const GENERATION_DISPATCH_LEASE_MS = 30_000;
export const GENERATION_RECOVERY_INTERVAL_MS = 15_000;
export const generationRetryDelayMs = (attempt: number): number =>
  Math.min(15_000 * 2 ** Math.max(0, attempt - 1), 120_000);
export const MIN_JUDGE_SCORE = 80;
export const MIN_CRITIC_SCORE = 75;
export const GENERATION_WORKER_ID = `thread-generation-${process.pid}`;
export const GENERATION_EVENT_SCHEMA_MAX_CORRELATION_LENGTH = 200;
export const generationEventSchema = z.object({
  jobId: z.string().min(1).max(64),
  correlationId: z.string().min(1).max(GENERATION_EVENT_SCHEMA_MAX_CORRELATION_LENGTH),
});
