import { z } from 'zod';

export const generationOwnerStateSchema = z.object({ ownerId: z.string().min(1).max(64) }).strict();

export type GenerationOwnerStateDto = z.infer<typeof generationOwnerStateSchema>;
