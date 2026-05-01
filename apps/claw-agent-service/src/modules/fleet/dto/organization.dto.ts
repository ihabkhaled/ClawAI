import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(60).regex(/^[a-z][a-z0-9-]*$/),
  ssoEnabled: z.boolean().default(false),
});

export type CreateOrganizationDto = z.infer<typeof createOrganizationSchema>;

export const addMemberSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
});

export type AddMemberDto = z.infer<typeof addMemberSchema>;
