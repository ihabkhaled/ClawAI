import { z } from 'zod';

// F093: bulk switch for Anthropic prompt caching. Bounded like the exposure
// request, so one call cannot rewrite a whole catalog unaudited.
export const setModelPromptCachingSchema = z.object({
  modelKeys: z.array(z.string().min(1).max(128)).min(1).max(200),
  enabled: z.boolean(),
});
export type SetModelPromptCachingDto = z.infer<typeof setModelPromptCachingSchema>;
