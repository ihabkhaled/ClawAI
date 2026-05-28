import { z } from 'zod';
import { Permission } from '@claw/shared-types';

export const setPermissionsSchema = z.object({
  permissions: z.array(z.nativeEnum(Permission)).max(100),
});

export type SetPermissionsDto = z.infer<typeof setPermissionsSchema>;
