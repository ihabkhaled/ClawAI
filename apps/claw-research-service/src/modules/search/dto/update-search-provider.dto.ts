import { z } from 'zod';

import { SearchProviderStatus } from '../../../common/enums/search-provider-status.enum';

export const updateSearchProviderSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  baseUrl: z.string().url().max(500).optional(),
  secretConfig: z.record(z.string(), z.string().max(4096)).optional(),
  publicConfig: z.record(z.string(), z.unknown()).optional(),
  enabled: z.boolean().optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  status: z.nativeEnum(SearchProviderStatus).optional(),
  allowlistDomains: z.array(z.string().max(256)).max(50).optional(),
  blocklistDomains: z.array(z.string().max(256)).max(50).optional(),
  timeoutMs: z.number().int().min(1_000).max(60_000).optional(),
});

export type UpdateSearchProviderDto = z.infer<typeof updateSearchProviderSchema>;
