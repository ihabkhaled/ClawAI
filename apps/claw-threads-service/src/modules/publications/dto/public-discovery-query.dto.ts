import { z } from 'zod';
import { Locale } from '@claw/shared-types';

export const publicDiscoveryQuerySchema = z.object({
  locale: z.nativeEnum(Locale),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const publicSitemapQuerySchema = z
  .object({
    locale: z.nativeEnum(Locale).optional(),
    /** `locale` (default) lists one content language; `all` lists every content language. */
    scope: z.enum(['locale', 'all']).default('locale'),
    page: z.coerce.number().int().min(0).max(100_000).default(0),
    limit: z.coerce.number().int().min(1).max(10_000).default(5_000),
  })
  .refine((query) => query.scope === 'all' || query.locale !== undefined, {
    message: 'locale is required unless scope=all',
    path: ['locale'],
  });

export type PublicDiscoveryQuery = z.infer<typeof publicDiscoveryQuerySchema>;
export type PublicSitemapQuery = z.infer<typeof publicSitemapQuerySchema>;
