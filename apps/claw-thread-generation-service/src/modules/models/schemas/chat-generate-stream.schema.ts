import { z } from 'zod';

import {
  FRAME_FALLBACK_STATUS,
  GATEWAY_ERROR_CODE_PATTERN,
} from '../constants/model-call.constants';

/**
 * Frames of chat-service's `POST /internal/chat/generate-stream` (application/x-ndjson).
 * Mirrored here on purpose (no shared package): `activity` means upstream bytes really
 * arrived, then exactly one terminal `result` or `error`. A frame of an unknown type is
 * ignored so the contract can grow; the free-text `message` is never read or forwarded.
 */
export const chatStreamFrameSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('activity') }),
  z.object({ type: z.literal('result'), data: z.unknown() }),
  z.object({
    type: z.literal('error'),
    status: z.number().int().min(100).max(599).catch(FRAME_FALLBACK_STATUS),
    code: z.string().regex(GATEWAY_ERROR_CODE_PATTERN).optional().catch(undefined),
    /** Redacted, at most 300 characters; shown to the owner as the step excerpt. */
    message: z.string().max(300).optional().catch(undefined),
    retryAfterSeconds: z.number().int().min(0).max(3600).optional().catch(undefined),
  }),
]);

export type ChatStreamFrame = z.infer<typeof chatStreamFrameSchema>;
