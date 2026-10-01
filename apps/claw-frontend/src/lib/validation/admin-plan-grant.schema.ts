import { z } from 'zod';

export const adminPlanGrantSchema = z.object({
  planId: z.string().min(1),
  durationMonths: z.number().int().min(1).max(60),
  grantReason: z.string().trim().min(1).max(500),
});

// A trial plan is granted in days (1..3650); every other plan in months (1..60).
// The field keeps its `durationMonths` name for both: it is the one number the form edits.
export const adminPlanGrantDaysSchema = adminPlanGrantSchema.extend({
  durationMonths: z.number().int().min(1).max(3650),
});

export type AdminPlanGrantFormValues = z.infer<typeof adminPlanGrantSchema>;
