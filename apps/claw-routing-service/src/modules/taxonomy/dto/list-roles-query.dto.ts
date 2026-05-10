import { z } from 'zod';
import { DomainTag } from '../../../generated/prisma';

export const listRolesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  industry: z.string().min(1).max(64).optional(),
  domain: z.nativeEnum(DomainTag).optional(),
  search: z.string().min(1).max(200).optional(),
});

export type ListRolesQueryDto = z.infer<typeof listRolesQuerySchema>;
