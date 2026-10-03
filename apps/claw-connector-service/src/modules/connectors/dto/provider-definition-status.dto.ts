import { z } from 'zod';

export const providerDefinitionStatusSchema = z.object({ isActive: z.boolean() }).strict();
export type ProviderDefinitionStatusDto = z.infer<typeof providerDefinitionStatusSchema>;
