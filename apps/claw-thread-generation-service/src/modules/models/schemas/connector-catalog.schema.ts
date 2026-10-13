import { z } from 'zod';

export const connectorCatalogSchema = z.object({
  providers: z.array(
    z.object({
      provider: z.string(),
      models: z.array(
        z.object({
          modelKey: z.string(),
          maxContextTokens: z.number().int().positive().nullable(),
        }),
      ),
    }),
  ),
});
