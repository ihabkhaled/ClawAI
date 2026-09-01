import { z } from 'zod';

export const adminPlanGrantSchema = z.object({
  planId: z.string().min(1),
  durationMonths: z.number().int().min(1).max(60),
  grantReason: z.string().trim().min(1).max(500),
});

export type AdminPlanGrantFormValues = z.infer<typeof adminPlanGrantSchema>;
