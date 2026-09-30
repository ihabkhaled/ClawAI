import { z } from 'zod';

import { ORGANIZATION_ID_MAX_LENGTH } from '../constants/usage-attribution.constants';

export const usageBreakdownQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).optional(),
  to: z.string().datetime({ offset: true }).optional(),
});

export type UsageBreakdownQueryDto = z.infer<typeof usageBreakdownQuerySchema>;

export const organizationIdParamSchema = z
  .string()
  .min(1)
  .max(ORGANIZATION_ID_MAX_LENGTH)
  .regex(/^[\w-]+$/u);
