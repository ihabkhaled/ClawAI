import { z } from 'zod';

// Self-registration requires email, password, first name, and last name, and
// accepts an optional phone. Role/plan/status are server-assigned; unknown
// client-supplied fields are stripped and the manager hard-codes role=USER.
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().min(1).max(64),
  lastName: z.string().trim().min(1).max(64),
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{6,14}$/, 'Phone must be in E.164 format')
    .optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;
