import { z } from 'zod';

export const discoveryTriggerSchema = z.object({
  sourceId: z.string().trim().max(64).optional(),
  isDryRun: z.boolean().default(false),
});
export type DiscoveryTriggerDto = z.infer<typeof discoveryTriggerSchema>;
