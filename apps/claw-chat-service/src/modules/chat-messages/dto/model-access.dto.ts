import { z } from 'zod';
import { MODEL_ACCESS_MAX_MODELS } from '../constants/model-exposure.constants';

export const modelAccessSchema = z.object({
  models: z
    .array(
      z.object({
        provider: z.string().min(1).max(100),
        model: z.string().min(1).max(255),
      }),
    )
    .min(1)
    .max(MODEL_ACCESS_MAX_MODELS),
});

export type ModelAccessDto = z.infer<typeof modelAccessSchema>;
