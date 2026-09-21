import { z } from 'zod';

import { MAX_ATTACHMENTS_PER_REQUEST } from '../constants/attachment.constants';

/**
 * Attachments, for any surface that accepts them.
 *
 * The seven orchestration labs had no `fileIds` field at all, so an attachment
 * was not merely ignored by them — it was not expressible. A user could attach
 * a document in Compare and not in Best-of-N, for no reason anybody chose.
 *
 * Spread into a schema the same way `researchFields` and
 * `advancedModelSelectionFields` are, so a surface opts in with one line and
 * the limit stays in one place.
 */
export const attachmentFields = {
  fileIds: z
    .array(z.string().max(255, 'File ID must be at most 255 characters'))
    .max(
      MAX_ATTACHMENTS_PER_REQUEST,
      `Maximum ${String(MAX_ATTACHMENTS_PER_REQUEST)} files per message`,
    )
    .optional(),
};
