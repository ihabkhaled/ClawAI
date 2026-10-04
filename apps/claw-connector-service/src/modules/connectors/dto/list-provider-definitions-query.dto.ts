import { z } from 'zod';
import { ProviderAdapterFamily } from '../../../generated/prisma';

export const listProviderDefinitionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(100_000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().trim().max(255).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
    builtIn: z
      .enum(['true', 'false'])
      .transform((value) => value === 'true')
      .optional(),
    adapterFamily: z.nativeEnum(ProviderAdapterFamily).optional(),
  })
  .strict();

export type ListProviderDefinitionsQueryDto = z.infer<typeof listProviderDefinitionsQuerySchema>;
