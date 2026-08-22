import { z } from 'zod';

// Mirrors the API: a blank optional field clears the stored value, so these
// stay strings here and are converted at the edge rather than being rejected.
const optionalName = z.string().trim().max(64);

export const profileIdentitySchema = z.object({
  firstName: optionalName,
  lastName: optionalName,
  phone: z
    .string()
    .trim()
    .refine((value) => value === '' || /^\+[1-9]\d{6,14}$/.test(value), {
      message: 'profile.phoneInvalid',
    }),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/),
  currentPassword: z.string().min(1).max(256),
});

export type ProfileIdentityFormValues = z.infer<typeof profileIdentitySchema>;
