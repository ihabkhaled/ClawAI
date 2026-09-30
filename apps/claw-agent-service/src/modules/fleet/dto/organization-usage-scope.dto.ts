import { z } from 'zod';

export const organizationUsageScopeQuerySchema = z.object({
  requesterId: z.string().min(1).max(64),
});

export type OrganizationUsageScopeQueryDto = z.infer<typeof organizationUsageScopeQuerySchema>;
