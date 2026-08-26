import { z } from 'zod';

// Bulk expose/unexpose. modelKeys is bounded so one request cannot be used to
// rewrite an entire catalog in a single unaudited call.
export const setModelExposureSchema = z.object({
  modelKeys: z.array(z.string().min(1).max(128)).min(1).max(200),
  exposed: z.boolean(),
});
export type SetModelExposureDto = z.infer<typeof setModelExposureSchema>;
