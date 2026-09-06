import { z } from 'zod';

import { ADMIN_STATISTICS_USER_ID_MAX_LENGTH } from '../constants/admin-user-statistics-dto.constants';

// Bounded like every other identifier that reaches a repository. The id lands
// in an indexed lookup and in a raw-SQL parameter, and an unbounded string is
// an unbounded scan even when it matches nothing.
export const adminUserStatisticsParamSchema = z.object({
  userId: z.string().min(1).max(ADMIN_STATISTICS_USER_ID_MAX_LENGTH),
});
export type AdminUserStatisticsParamDto = z.infer<typeof adminUserStatisticsParamSchema>;
