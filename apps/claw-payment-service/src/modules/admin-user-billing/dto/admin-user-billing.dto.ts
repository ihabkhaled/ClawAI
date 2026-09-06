import { z } from 'zod';

import { ADMIN_USER_ID_MAX_LENGTH } from '../constants/admin-user-billing.constants';

// The userId is an opaque auth-service identifier with no foreign key on this
// side, so it is validated for shape and length here rather than being trusted
// because an admin sent it.
export const adminUserParamSchema = z.object({
  userId: z.string().min(1).max(ADMIN_USER_ID_MAX_LENGTH),
});

export type AdminUserParamDto = z.infer<typeof adminUserParamSchema>;
