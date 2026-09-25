import { z } from 'zod';

import {
  GENERATED_AUDIO_FILENAME_MAX_LENGTH,
  GENERATED_AUDIO_MAX_BASE64_LENGTH,
  GENERATED_AUDIO_MIME_TYPES,
  GENERATED_AUDIO_TRANSCRIPT_MAX_LENGTH,
} from '../constants/generated-audio.constants';

/**
 * Body of `POST /internal/files/store-generated-audio` (service token). The
 * owner is named by the calling service (chat-service names the message's
 * owner); the bytes still go through the full security pipeline.
 */
export const storeGeneratedAudioSchema = z
  .object({
    userId: z.string().trim().min(1).max(128),
    filename: z.string().trim().min(1).max(GENERATED_AUDIO_FILENAME_MAX_LENGTH),
    mimeType: z.enum(GENERATED_AUDIO_MIME_TYPES),
    base64Data: z
      .string()
      .min(1)
      .max(GENERATED_AUDIO_MAX_BASE64_LENGTH)
      .regex(/^[A-Za-z0-9+/]+={0,2}$/),
    transcript: z.string().max(GENERATED_AUDIO_TRANSCRIPT_MAX_LENGTH).optional(),
  })
  .strict();

export type StoreGeneratedAudioDto = z.infer<typeof storeGeneratedAudioSchema>;
