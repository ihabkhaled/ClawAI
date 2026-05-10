import { z } from 'zod';
import { DomainTag, PrivacyClass } from '../../../generated/prisma';

export const createRoleSchema = z.object({
  roleKey: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1).max(200),
  industryKey: z.string().min(1).max(64),
  domainKey: z.nativeEnum(DomainTag),
  capabilities: z.array(z.string().min(1).max(64)).max(50).default([]),
  privacyDefault: z.nativeEnum(PrivacyClass).default(PrivacyClass.CLOUD_PERMITTED),
});

export type CreateRoleDto = z.infer<typeof createRoleSchema>;
