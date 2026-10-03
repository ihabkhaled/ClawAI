import { SaveIntentTarget } from '@claw/shared-utilities';
import { z } from 'zod';

/**
 * The one-click "Save as context pack / Save to memory" on a chat message.
 * `packId` names an existing pack to add to; with no `packId` a new pack is
 * created. It is meaningless for a memory, so it is refused there rather than
 * silently ignored.
 */
export const saveMessageToContextSchema = z
  .object({
    target: z.nativeEnum(SaveIntentTarget),
    packId: z.string().min(1).max(255).optional(),
  })
  .refine((value) => value.packId === undefined || value.target === SaveIntentTarget.CONTEXT_PACK, {
    message: 'A pack can only be chosen when saving to a context pack',
    path: ['packId'],
  });

export type SaveMessageToContextDto = z.infer<typeof saveMessageToContextSchema>;
