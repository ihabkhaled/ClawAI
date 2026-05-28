import { z } from 'zod';

// Self-registration only accepts email + password. Role/plan/status are
// server-assigned — any client-supplied role is ignored (the schema strips
// unknown keys, and the manager hard-codes role=USER).
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
});

export type RegisterDto = z.infer<typeof registerSchema>;
