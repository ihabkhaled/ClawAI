import { z } from 'zod';

export const PUBLICATION_DISCOVERY_CURSOR_SCHEMA = z
  .object({ slug: z.string().min(1).max(64), publishedAt: z.string().datetime() })
  .strict();
