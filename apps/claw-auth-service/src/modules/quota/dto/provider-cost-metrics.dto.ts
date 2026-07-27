import { z } from 'zod';

export const providerCostQuerySchema = z.object({
  from: z.string().datetime({ offset: true }),
});

export type ProviderCostQuery = z.infer<typeof providerCostQuerySchema>;
