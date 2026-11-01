import { z } from 'zod';

import {
  MEDIA_MODEL_HINT_MAX_CHARS,
  MEDIA_PROMPT_MAX_CHARS,
  MEDIA_VIDEO_SECONDS,
  MEDIA_VOICE_MAX_CHARS,
} from '../constants/media-tools.constants';
import { MediaKind } from '../enums/media-kind.enum';

const promptSchema = z.string().trim().min(1).max(MEDIA_PROMPT_MAX_CHARS);
const modelSchema = z
  .string()
  .trim()
  .min(1)
  .max(MEDIA_MODEL_HINT_MAX_CHARS)
  .optional()
  .catch(undefined);

/**
 * What a chat model may send each media tool. A bad OPTIONAL field is dropped (`catch`) so a
 * wrong size word never costs the user their image; a bad or empty prompt is an error.
 */
export const MEDIA_TOOL_ARG_SCHEMA: ReadonlyMap<
  MediaKind,
  z.ZodType<Record<string, unknown>>
> = new Map<MediaKind, z.ZodType<Record<string, unknown>>>([
  [
    MediaKind.IMAGE,
    z.object({
      prompt: promptSchema,
      size: z.enum(['square', 'portrait', 'landscape']).optional().catch(undefined),
      model: modelSchema,
    }),
  ],
  [
    MediaKind.VIDEO,
    z.object({
      prompt: promptSchema,
      durationSeconds: z.coerce
        .number()
        .int()
        .min(MEDIA_VIDEO_SECONDS.min)
        .max(MEDIA_VIDEO_SECONDS.max)
        .optional()
        .catch(undefined),
      aspectRatio: z.enum(['16:9', '9:16']).optional().catch(undefined),
      model: modelSchema,
    }),
  ],
  [
    MediaKind.AUDIO,
    z.object({
      prompt: promptSchema,
      kind: z.enum(['SPEECH', 'MUSIC']).optional().catch(undefined),
      voice: z.string().trim().min(1).max(MEDIA_VOICE_MAX_CHARS).optional().catch(undefined),
      format: z.enum(['mp3', 'wav']).optional().catch(undefined),
      model: modelSchema,
    }),
  ],
]);
