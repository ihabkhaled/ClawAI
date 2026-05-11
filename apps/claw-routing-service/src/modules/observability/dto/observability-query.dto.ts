import { z } from 'zod';

export const observabilityQuerySchema = z.object({
  from: z.coerce.date(),
  to: z.coerce.date(),
});

export type ObservabilityQueryDto = z.infer<typeof observabilityQuerySchema>;
