import { z } from 'zod';

export const HfSearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  sort: z.enum(['trending', 'downloads', 'likes', 'lastModified']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20).optional(),
});

export type HfSearchQueryDto = z.infer<typeof HfSearchQuerySchema>;

export const HfAddRequestSchema = z.object({
  repo: z
    .string()
    .trim()
    .min(3)
    .max(200)
    .regex(/^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/, 'repo must be "owner/name"'),
  quantization: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/),
  category: z.enum(['CODING', 'GENERAL', 'REASONING', 'THINKING', 'FILE_GENERATION']),
  qualityTier: z.enum(['SURVIVAL', 'BALANCED', 'BEST']),
});

export type HfAddRequestDto = z.infer<typeof HfAddRequestSchema>;
