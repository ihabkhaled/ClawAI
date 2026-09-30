import { z } from 'zod';

export const organizationUsageScopeSchema = z.object({
  organizationId: z.string().min(1),
  memberUserIds: z.array(z.string().min(1)),
});
