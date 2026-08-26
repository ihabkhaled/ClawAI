import { z } from 'zod';

// auth-service asks whether a set of (provider, model) pairs are real, exposed,
// chat-capable deployments before it will persist them as plan entitlements. It
// cannot read this service's database, so the question has to cross HTTP.
// Bounded so one call cannot be used to enumerate the whole catalog.
export const validateExposedModelsSchema = z.object({
  pairs: z
    .array(
      z.object({
        provider: z.string().min(1).max(64),
        model: z.string().min(1).max(128),
      }),
    )
    .min(1)
    .max(200),
});
export type ValidateExposedModelsDto = z.infer<typeof validateExposedModelsSchema>;
