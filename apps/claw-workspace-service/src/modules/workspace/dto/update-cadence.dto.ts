import { z } from 'zod';
import {
  CADENCE_OVERRIDE_MAX_SECONDS,
  CADENCE_OVERRIDE_MIN_SECONDS,
} from '../constants/sync-cadence.constants';

export const updateCadenceSchema = z
  .object({
    syncIntervalSeconds: z
      .number()
      .int()
      .min(CADENCE_OVERRIDE_MIN_SECONDS)
      .max(CADENCE_OVERRIDE_MAX_SECONDS),
  })
  .strict();

export type UpdateCadenceDto = z.infer<typeof updateCadenceSchema>;
