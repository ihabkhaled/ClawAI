import { z } from 'zod';

export const MAX_GENERATION_ROUNDS = 3;
export const MIN_JUDGE_SCORE = 80;
export const MIN_CRITIC_SCORE = 75;
export const GENERATION_WORKER_ID = `thread-generation-${process.pid}`;
export const GENERATION_EVENT_SCHEMA_MAX_CORRELATION_LENGTH = 200;
export const generationEventSchema = z.object({
  jobId: z.string().min(1).max(64),
  correlationId: z.string().min(1).max(GENERATION_EVENT_SCHEMA_MAX_CORRELATION_LENGTH),
});
