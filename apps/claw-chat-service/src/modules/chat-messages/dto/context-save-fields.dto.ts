import { z } from 'zod';

/**
 * How a "remember this" request is handled (ADR-168): ASK proposes the save and
 * waits for the user's confirmation (the default when omitted); AUTO saves
 * immediately like ADR-134. Spread next to `researchFields` and
 * `contextPackFields` by every chat DTO so the choice works on every surface
 * (rule 59).
 */
export const contextSaveFields = {
  contextSaveMode: z.enum(['ASK', 'AUTO']).optional(),
};
