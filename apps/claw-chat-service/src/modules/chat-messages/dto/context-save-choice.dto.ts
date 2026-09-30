import { z } from 'zod';

/** The user's answer on the "which pack?" card: one existing pack, or a new one. */
export const contextSaveChoiceSchema = z
  .object({
    packId: z.string().min(1).max(255).optional(),
    newPack: z.boolean().optional(),
  })
  .refine((value) => (value.packId !== undefined) !== (value.newPack === true), {
    message: 'Choose either an existing pack or a new pack',
    path: ['packId'],
  });

export type ContextSaveChoiceDto = z.infer<typeof contextSaveChoiceSchema>;
