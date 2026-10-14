import { z } from 'zod';

/**
 * The slice of connector-service's public model catalog AUTO reads. Lenient on
 * purpose: a field the catalog adds later must not turn every AUTO run into
 * "no model available".
 */
export const publicModelCatalogSchema = z.object({
  providers: z.array(
    z.object({
      provider: z.string().min(1),
      models: z.array(
        z.object({
          modelKey: z.string().min(1),
          displayName: z.string().nullish(),
          maxContextTokens: z.number().nullish(),
          usageTier: z.string().nullish(),
          supportsStructuredOutput: z.boolean().nullish(),
          supportsTools: z.boolean().nullish(),
        }),
      ),
    }),
  ),
});
