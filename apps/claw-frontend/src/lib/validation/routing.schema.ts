import { z } from 'zod';

import { RoutingMode } from '@/enums';

const routingModeValues = Object.values(RoutingMode) as [string, ...string[]];

export const createRoutingPolicySchema = z.object({
  name: z
    .string()
    .min(1, 'Policy name is required')
    .max(255, 'Name must be at most 255 characters'),
  routingMode: z.enum(routingModeValues, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid routing mode',
    }),
  }),
  priority: z
    .number()
    .min(0, 'Priority must be at least 0')
    .max(1000, 'Priority must be at most 1,000'),
  isActive: z.boolean().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const updateRoutingPolicySchema = createRoutingPolicySchema.partial();

export type CreateRoutingPolicyInput = z.infer<typeof createRoutingPolicySchema>;
export type UpdateRoutingPolicyInput = z.infer<typeof updateRoutingPolicySchema>;
