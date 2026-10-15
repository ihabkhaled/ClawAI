import { z } from 'zod';

import { CHANGE_REQUEST_SUGGESTION_MAX_LENGTH } from '../constants/publication-change-request.constants';

export const createPublicationChangeRequestSchema = z.object({
  suggestion: z.string().trim().min(1).max(CHANGE_REQUEST_SUGGESTION_MAX_LENGTH),
});

export type CreatePublicationChangeRequestDto = z.infer<
  typeof createPublicationChangeRequestSchema
>;
