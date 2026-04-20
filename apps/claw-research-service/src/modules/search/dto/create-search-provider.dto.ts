import { z } from 'zod';

import { SearchProviderKind } from '../../../common/enums/search-provider-kind.enum';

export const createSearchProviderSchema = z.object({
  kind: z.nativeEnum(SearchProviderKind),
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  baseUrl: z.string().url().max(500),
  /** Secret config blob. Typically `{ apiKey: "..." }` or `{ username, password }`. */
  secretConfig: z.record(z.string().max(4096)).optional(),
  publicConfig: z.record(z.unknown()).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  allowlistDomains: z.array(z.string().max(256)).max(50).optional(),
  blocklistDomains: z.array(z.string().max(256)).max(50).optional(),
  timeoutMs: z.number().int().min(1_000).max(60_000).optional(),
});

export type CreateSearchProviderDto = z.infer<typeof createSearchProviderSchema>;
