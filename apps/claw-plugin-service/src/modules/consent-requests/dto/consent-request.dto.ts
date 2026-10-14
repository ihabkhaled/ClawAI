import { z } from 'zod';

import { ConsentChoiceKind } from '../../../common/enums/consent-choice.enum';
import { CONSENT_WAIT_MAX_MS, REQUEST_ID_MAX } from '../constants/consent-requests.constants';

export const requestIdSchema = z.string().uuid();

export const decisionBodySchema = z.strictObject({
  choice: z.nativeEnum(ConsentChoiceKind),
  /** The second confirmation. Required for "Always allow" on a DESTRUCTIVE tool. */
  confirmDestructive: z.boolean().default(false),
});
export type DecisionBody = z.infer<typeof decisionBodySchema>;

export const listQuerySchema = z.object({
  conversationId: z.string().min(1).max(REQUEST_ID_MAX).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

/** POST /internal/plugins/consent-requests/:id/wait. The owner is named by chat-service, like every internal route. */
export const waitBodySchema = z.strictObject({
  userId: z.string().min(1).max(REQUEST_ID_MAX),
  waitMs: z.number().int().min(0).max(CONSENT_WAIT_MAX_MS).default(CONSENT_WAIT_MAX_MS),
});
export type WaitBody = z.infer<typeof waitBodySchema>;
