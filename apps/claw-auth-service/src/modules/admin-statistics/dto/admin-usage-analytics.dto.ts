import { z } from 'zod';

import { ADMIN_STATISTICS_USER_ID_MAX_LENGTH } from '../constants/admin-user-statistics-dto.constants';
import {
  ADMIN_USAGE_DEFAULT_LIMIT,
  ADMIN_USAGE_MAX_HOURS,
  ADMIN_USAGE_MAX_LIMIT,
} from '../constants/admin-usage-analytics.constants';

const isoInstant = z.string().datetime({ offset: true });

/**
 * Time selection shared by both endpoints: either `hours` (the last N hours,
 * up to a week) or an explicit `from`/`to`. Never both. The 90-day cap and
 * `from < to` are checked by `resolveUsageRange`, which also knows "now".
 */
export const adminUsageRangeQuerySchema = z
  .object({
    hours: z.coerce.number().int().min(1).max(ADMIN_USAGE_MAX_HOURS).optional(),
    from: isoInstant.optional(),
    to: isoInstant.optional(),
  })
  .refine((q) => q.hours === undefined || (q.from === undefined && q.to === undefined), {
    message: 'hours cannot be combined with from/to',
    path: ['hours'],
  });

export const adminUsageAnalyticsQuerySchema = adminUsageRangeQuerySchema.and(
  z.object({
    userId: z.string().min(1).max(ADMIN_STATISTICS_USER_ID_MAX_LENGTH).optional(),
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(ADMIN_USAGE_MAX_LIMIT)
      .default(ADMIN_USAGE_DEFAULT_LIMIT),
  }),
);

export type AdminUsageRangeQueryDto = z.infer<typeof adminUsageRangeQuerySchema>;
export type AdminUsageAnalyticsQueryDto = z.infer<typeof adminUsageAnalyticsQuerySchema>;
