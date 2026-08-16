import { z } from 'zod';

/**
 * Validates a trace batch arriving over RabbitMQ.
 *
 * The payload crosses a service boundary, so it is parsed rather than cast.
 * `passthrough` on the payload keeps forward compatibility: a newer
 * routing-service adding a field must not make an older chat-service drop the
 * whole batch.
 */
export const routerTraceEventSchema = z.object({
  schemaVersion: z.literal('router-trace-v1'),
  eventId: z.string().min(1).max(128),
  traceId: z.string().min(1).max(128),
  requestId: z.string().min(1).max(128),
  threadId: z.string().max(128).nullable(),
  sequence: z.number().int().min(1),
  timestamp: z.string().max(64),
  type: z.string().min(1).max(128),
  payload: z.object({}).passthrough(),
});

export const routerTraceEmittedSchema = z.object({
  traceId: z.string().min(1).max(128),
  requestId: z.string().min(1).max(128),
  threadId: z.string().max(128).nullable(),
  // Unknown events are dropped individually rather than failing the batch, so
  // one malformed frame cannot cost a user their whole timeline.
  events: z.array(routerTraceEventSchema).max(500),
});

export type RouterTraceEmittedDto = z.infer<typeof routerTraceEmittedSchema>;
