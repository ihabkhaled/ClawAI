import { z } from 'zod';
import { RoutingMode } from '../../../generated/prisma';

/**
 * How to answer again (chat-supremacy Batch 4). Every field is optional: an
 * empty body keeps the old behaviour — the thread's pinned model, else the
 * mode the turn was first routed with. AUTO re-routes from scratch; a manual
 * pick needs both halves of the model id, and passes the same plan check a
 * new message would.
 */
export const regenerateMessageSchema = z.preprocess(
  // Express leaves the body undefined when a client sends none; that is the
  // same request as `{}` — "answer again the usual way".
  (value) => value ?? {},
  z
    .object({
      routingMode: z.enum([RoutingMode.AUTO, RoutingMode.MANUAL_MODEL]).optional(),
      provider: z.string().min(1).max(50, 'Provider must be at most 50 characters').optional(),
      model: z.string().min(1).max(255, 'Model must be at most 255 characters').optional(),
    })
    .refine(
      (value) =>
        value.routingMode !== RoutingMode.MANUAL_MODEL ||
        (value.provider !== undefined && value.model !== undefined),
      { message: 'A manual model needs both provider and model', path: ['model'] },
    ),
);

export type RegenerateMessageDto = z.infer<typeof regenerateMessageSchema>;
