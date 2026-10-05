import { z } from 'zod';

import { fetchRequestSchema } from './fetch-request.dto';

/**
 * A single-page fetch for a sibling service (chat-service's `web_fetch` tool),
 * naming the user explicitly. Only ever accepted behind ServiceTokenGuard, after
 * the caller applied the plan gate. `refresh` is not accepted: a tool call has no
 * business bypassing the page cache.
 */
export const internalFetchSchema = fetchRequestSchema
  .pick({ url: true, timeoutMs: true, render: true })
  .extend({ userId: z.string().min(1).max(64) });

export type InternalFetchDto = z.infer<typeof internalFetchSchema>;
