import { z } from 'zod';

const currentPasswordSchema = z.string().min(1).max(256);
const usernameSchema = z
  .string()
  .min(3)
  .max(32)
  .regex(/^[a-zA-Z0-9_-]+$/);

// A blank value clears the column. `undefined` means the caller did not touch
// the field, which is what lets one endpoint serve a form that submits only the
// fields the user actually edited.
const optionalNameSchema = z
  .string()
  .trim()
  .max(64)
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional();

const optionalPhoneSchema = z
  .string()
  .trim()
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .optional()
  .refine((value) => value === null || value === undefined || /^\+[1-9]\d{6,14}$/.test(value), {
    message: 'Phone must be in international format, for example +14155550123',
  });

export const updateOwnProfileSchema = z
  .object({
    currentPassword: currentPasswordSchema,
    username: usernameSchema.optional(),
    firstName: optionalNameSchema,
    lastName: optionalNameSchema,
    phone: optionalPhoneSchema,
  })
  .refine(
    (value) =>
      value.username !== undefined ||
      value.firstName !== undefined ||
      value.lastName !== undefined ||
      value.phone !== undefined,
    { message: 'At least one profile field is required' },
  );

export const deleteOwnAccountSchema = z.object({
  currentPassword: currentPasswordSchema,
});

export type UpdateOwnProfileDto = z.infer<typeof updateOwnProfileSchema>;
export type DeleteOwnAccountDto = z.infer<typeof deleteOwnAccountSchema>;
