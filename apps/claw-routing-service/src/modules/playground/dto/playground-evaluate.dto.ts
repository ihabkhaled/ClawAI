// SCAFFOLD: stream R.5 (06-r5-operator-playground)

import { z } from 'zod';

export const playgroundEvaluateSchema = z.object({
  message: z.string().min(1).max(200_000),
  attachments: z
    .array(
      z.object({
        fileId: z.string().min(1).max(200),
        filename: z.string().min(1).max(500),
        mimeType: z.string().min(1).max(200),
        sizeBytes: z.number().int().nonnegative().max(5_000_000_000),
      }),
    )
    .max(50)
    .default([]),
  userMode: z
    .enum(['AUTO', 'MANUAL_MODEL', 'LOCAL_ONLY', 'PRIVACY_FIRST', 'LOW_LATENCY', 'HIGH_REASONING', 'COST_SAVER'])
    .default('AUTO'),
  compareWithV2: z.boolean().default(true),
  compareWithOllamaRouter: z.boolean().default(true),
});

export type PlaygroundEvaluateDto = z.infer<typeof playgroundEvaluateSchema>;
