import { z } from 'zod';

import { CHECKSUM_PATTERN, IMPORT_GITHUB } from '../constants/plugin-import.constants';

const SUBDIR_MAX = 200;

export const githubPreviewBodySchema = z.strictObject({
  source: z.string().min(1).max(IMPORT_GITHUB.sourceMaxLength),
  subdir: z.string().max(SUBDIR_MAX).optional(),
});

/** The multipart text fields that accompany the file. Unknown fields are ignored by the controller. */
export const uploadFieldsSchema = z.object({ subdir: z.string().max(SUBDIR_MAX).optional() });

export const confirmBodySchema = z.strictObject({
  checksum: z.string().regex(CHECKSUM_PATTERN),
  acknowledged: z.literal(true),
});

export type GithubPreviewBody = z.infer<typeof githubPreviewBodySchema>;
export type UploadFields = z.infer<typeof uploadFieldsSchema>;
export type ConfirmBody = z.infer<typeof confirmBodySchema>;
