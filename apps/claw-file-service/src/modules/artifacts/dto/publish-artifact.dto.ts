import { z } from 'zod';
import {
  ARTIFACT_MIME_TYPES,
  MAX_ARTIFACT_FILENAME_LENGTH,
  MAX_ARTIFACT_TITLE_LENGTH,
} from '../constants/artifact.constants';
import { isSafeArtifactFilename } from '../utilities/artifact-filename.utility';

/**
 * The body the coding agent sends (`ArtifactUpload` in
 * apps/claw-coding-agent/src/backend/artifact-client.ts). Content size is NOT
 * bounded here: the service measures UTF-8 bytes and answers 413, which a
 * character count cannot do.
 */
export const publishArtifactSchema = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1)
      .max(MAX_ARTIFACT_FILENAME_LENGTH)
      .refine(
        isSafeArtifactFilename,
        'Filename must be a single name with no path or control characters',
      ),
    mimeType: z.enum(ARTIFACT_MIME_TYPES),
    content: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u, 'sha256 must be 64 lower-case hex characters'),
    title: z.string().trim().min(1).max(MAX_ARTIFACT_TITLE_LENGTH).optional(),
  })
  .strict();

export type PublishArtifactDto = z.infer<typeof publishArtifactSchema>;
