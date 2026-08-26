import { z } from 'zod';

export const instantiateChainTemplateSchema = z.object({
  name: z.string().min(1).max(160),
  connectorSelections: z.record(z.string(), z.string().min(1).max(128)),
});

export type InstantiateChainTemplateDto = z.infer<typeof instantiateChainTemplateSchema>;
