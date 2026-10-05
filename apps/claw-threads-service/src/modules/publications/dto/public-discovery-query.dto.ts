import { z } from 'zod';
import { Locale } from '@claw/shared-types';

export const publicDiscoveryQuerySchema = z.object({
  locale: z.nativeEnum(Locale),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const publicSitemapQuerySchema = z.object({
  locale: z.nativeEnum(Locale),
  page: z.coerce.number().int().min(0).max(100_000).default(0),
  limit: z.coerce.number().int().min(1).max(10_000).default(5_000),
});

export type PublicDiscoveryQuery = z.infer<typeof publicDiscoveryQuerySchema>;
export type PublicSitemapQuery = z.infer<typeof publicSitemapQuerySchema>;
