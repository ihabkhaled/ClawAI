import { z } from 'zod';

import { FetchRenderHint } from '../enums/fetch-render-hint.enum';

export const fetchRequestSchema = z.object({
  url: z.string().url().max(2048),
  timeoutMs: z.number().int().min(500).max(60_000).optional(),
  refresh: z.boolean().optional(),
  /** Tier-ordering hint only; see FetchRenderHint. */
  render: z.nativeEnum(FetchRenderHint).optional(),
});

export type FetchRequestDto = z.infer<typeof fetchRequestSchema>;
