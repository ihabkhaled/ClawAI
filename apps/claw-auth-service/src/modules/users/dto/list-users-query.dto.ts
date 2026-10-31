import { z } from 'zod';
import { PresenceFilter, SortOrder, UserRole, UserStatus } from '../../../common/enums';

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255, 'Search must be at most 255 characters').optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  planId: z.string().min(1).max(255).optional(),
  verification: z.enum(['VERIFIED', 'UNVERIFIED']).optional(),
  presence: z.nativeEnum(PresenceFilter).optional(),
  banned: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  sortBy: z
    .enum(['createdAt', 'email', 'username', 'role', 'status', 'lastSeenAt'])
    .default('createdAt'),
  sortOrder: z.nativeEnum(SortOrder).default(SortOrder.DESC),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
