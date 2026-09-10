import { z } from 'zod';

import { CLIENT_LOG_BATCH_MAX_EVENTS } from '../constants/client-logs.constants';
import { createClientLogSchema } from './create-client-log.dto';

/**
 * A batch of client log events.
 *
 * The single-event endpoint stays for compatibility, but the browser should
 * use this one: the client logger buffers for five seconds and then used to
 * issue one HTTP request per buffered entry in a loop, which is what turned a
 * page mount into a burst of twenty-odd requests within the same millisecond.
 * Each of those also cost one rate-limit unit and one Mongo `save()`.
 *
 * Wrapped in an object rather than a bare array so the payload has somewhere to
 * grow — a client-side clock skew hint, a session id, a dropped-event count —
 * without another breaking change.
 */
export const createClientLogBatchSchema = z.object({
  events: z.array(createClientLogSchema).min(1).max(CLIENT_LOG_BATCH_MAX_EVENTS),
});

export type CreateClientLogBatchDto = z.infer<typeof createClientLogBatchSchema>;
