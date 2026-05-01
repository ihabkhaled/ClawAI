import { z } from 'zod';

import { recipeDslSchema } from '../../recipes/dto/recipe-dsl.dto';

export const publishListingSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional(),
  dsl: recipeDslSchema,
  signaturePublicKey: z.string().regex(/^[0-9a-f]{64}$/, 'must be 32-byte hex'),
  signature: z.string().regex(/^[0-9a-f]{128}$/, 'must be 64-byte hex'),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type PublishListingDto = z.infer<typeof publishListingSchema>;

export const listListingsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().max(200).optional(),
});

export type ListListingsQueryDto = z.infer<typeof listListingsQuerySchema>;
