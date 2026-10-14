import { z } from 'zod';

import { modelRoleSchema } from './generation-pipeline.types';

/** The fields of a stored job request (generation or revision review) that progress shows. */
export const progressRequestSchema = z.object({
  topic: z.string(),
  publicationType: z.string(),
  contentLocale: z.string(),
  authors: z.array(modelRoleSchema),
  judge: modelRoleSchema,
  critic: modelRoleSchema,
});

export type ProgressRequest = z.infer<typeof progressRequestSchema>;

export type ProgressJobRecord = {
  id: string;
  status: string;
  stage: string;
  round: number;
  attemptCount: number;
  spentMicroCredits: bigint;
  budgetCloseStatus: string | null;
  spendCapMicroUsd: bigint;
  sourceThreadId: string;
  safeErrorCode: string | null;
  request: unknown;
  createdAt: Date;
  updatedAt: Date;
};
