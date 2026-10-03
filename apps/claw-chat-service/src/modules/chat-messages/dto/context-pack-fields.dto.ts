import { z } from 'zod';

/**
 * Context packs for an orchestration run, spread by every lab / compare / consensus /
 * escalation DTO next to `researchFields` and `attachmentFields`. They are stored on the
 * thread the run creates, which is where chat-service's context gateway reads them, so a
 * pack reaches the model exactly as it does in normal chat.
 */
export const contextPackFields = {
  contextPackIds: z.array(z.string().max(255)).max(10, 'Maximum 10 context packs').optional(),
};
