import { z } from 'zod';

import { PUBLICATION_REVOKE_REASON_MAX_LENGTH } from '../constants/publication-revoke.constants';

export const revokePublicationSchema = z
  .object({
    reason: z.string().trim().min(1).max(PUBLICATION_REVOKE_REASON_MAX_LENGTH).optional(),
  })
  .default({});

export type RevokePublicationDto = z.infer<typeof revokePublicationSchema>;
