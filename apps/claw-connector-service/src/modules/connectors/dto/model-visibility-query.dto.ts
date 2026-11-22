import { z } from 'zod';

// `GET /connectors/model-visibility?provider=&modelKey=`. Provider is the enum
// (GEMINI) or a custom provider's definition key; modelKey is any catalog
// spelling (`gemini-decision-1` or `models/gemini-decision-1`).
export const modelVisibilityQuerySchema = z.object({
  provider: z.string().trim().min(1).max(100),
  modelKey: z.string().trim().min(1).max(255),
});
export type ModelVisibilityQueryDto = z.infer<typeof modelVisibilityQuerySchema>;
