import { z } from 'zod';
import { UserRole, UserStatus } from '../../../common/enums';
import { PHONE_E164_PATTERN } from '../constants/user-admin.constants';

export const updateUserSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username may only contain letters, numbers, hyphens, and underscores',
    )
    .optional(),
  firstName: z
    .string()
    .trim()
    .max(64, 'First name must be at most 64 characters')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  lastName: z
    .string()
    .trim()
    .max(64, 'Last name must be at most 64 characters')
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .optional(),
  // Admin-editable phone: E.164-ish, or an empty string / null to clear it.
  phone: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value))
    .nullable()
    .refine((value) => value === null || PHONE_E164_PATTERN.test(value), {
      message: 'Phone must be in international format, e.g. +201001234567',
    })
    .optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
