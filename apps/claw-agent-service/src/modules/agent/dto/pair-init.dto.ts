import { z } from 'zod';
import { deviceHintSchema } from './device-hint.dto';

export const pairInitSchema = z.object({
  deviceHint: deviceHintSchema,
  loopbackPort: z.coerce.number().int().min(1_024).max(65_535).nullable().optional(),
});

export type PairInitDto = z.infer<typeof pairInitSchema>;
