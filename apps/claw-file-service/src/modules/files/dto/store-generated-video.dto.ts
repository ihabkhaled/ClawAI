import { z } from 'zod';

import {
  GENERATED_VIDEO_FILENAME_MAX_LENGTH,
  GENERATED_VIDEO_MAX_BASE64_LENGTH,
  GENERATED_VIDEO_MIME_TYPES,
} from '../constants/generated-video.constants';

/**
 * Body of `POST /internal/files/store-generated-video` (service token). The
 * owner is named by the calling service (image-service names the generation's
 * owner); the bytes still go through the full security pipeline.
 */
export const storeGeneratedVideoSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    filename: z.string().trim().min(1).max(GENERATED_VIDEO_FILENAME_MAX_LENGTH),
    mimeType: z.enum(GENERATED_VIDEO_MIME_TYPES),
    base64Data: z
      .string()
      .min(1)
      .max(GENERATED_VIDEO_MAX_BASE64_LENGTH)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
  })
  .strict();

export type StoreGeneratedVideoDto = z.infer<typeof storeGeneratedVideoSchema>;
