import { z } from 'zod';
import {
  VIDEO_FRAMES_MAX_TIMESTAMPS,
  VIDEO_MAX_DURATION_MS,
} from '../constants/video-processing.constants';

/**
 * `POST /internal/files/:id/video-frames` (multimodal batch 7). The owner is
 * named in the body and checked against the row. 1..8 integer timestamps; the
 * upper bound here is the GLOBAL cap — the per-video `durationMs` bound is
 * checked by the service, which is the only place that knows it.
 */
export const videoFramesSchema = z
  .object({
    userId: z.string().min(1).max(128),
    timestampsMs: z
      .array(z.number().int().min(0).max(VIDEO_MAX_DURATION_MS))
      .min(1)
      .max(VIDEO_FRAMES_MAX_TIMESTAMPS),
  })
  .strict();

export type VideoFramesDto = z.infer<typeof videoFramesSchema>;

/** The slice of `extractionMetadata` the frames endpoint trusts, re-validated on read. */
export const videoFramesMetadataSchema = z.object({
  media: z.object({
    durationMs: z.number().int().positive(),
    failureReason: z.string().nullable().optional(),
  }),
});
