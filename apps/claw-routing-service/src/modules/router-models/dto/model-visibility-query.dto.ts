import { z } from 'zod';

// Query params, not path params: Gemini keys carry a slash (`models/gemini-decision-1`).
export const modelVisibilityQuerySchema = z.object({
  provider: z.string().trim().min(1).max(100),
  model: z.string().trim().min(1).max(255),
});

export type ModelVisibilityQueryDto = z.infer<typeof modelVisibilityQuerySchema>;
