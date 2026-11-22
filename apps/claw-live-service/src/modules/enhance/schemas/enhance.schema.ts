import { z } from 'zod';

export const rateResponseSchema = z.object({
  isPriced: z.boolean(),
  inputPerMillionMicroUsd: z.number().int().min(0).nullable(),
  outputPerMillionMicroUsd: z.number().int().min(0).nullable(),
});

export const generateResponseSchema = z.object({
  content: z.string(),
  costMicroUsd: z.number().int().min(0).optional(),
});
