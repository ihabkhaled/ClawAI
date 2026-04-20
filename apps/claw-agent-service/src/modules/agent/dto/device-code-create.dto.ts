import { z } from 'zod';
import { deviceHintSchema } from './device-hint.dto';

export const deviceCodeCreateSchema = z.object({
  deviceHint: deviceHintSchema,
});

export type DeviceCodeCreateDto = z.infer<typeof deviceCodeCreateSchema>;
