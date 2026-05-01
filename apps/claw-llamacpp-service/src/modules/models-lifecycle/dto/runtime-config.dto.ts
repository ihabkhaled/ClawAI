import { z } from 'zod';

export const UpdateRuntimeConfigSchema = z.object({
  nGpuLayers: z.number().int().min(0).max(999).nullable().optional(),
  ctxSize: z.number().int().min(512).max(1_048_576).optional(),
  cpuMoe: z.boolean().optional(),
  threads: z.number().int().min(1).max(256).nullable().optional(),
  customArgs: z.string().max(1000).nullable().optional(),
});

export type UpdateRuntimeConfigDto = z.infer<typeof UpdateRuntimeConfigSchema>;

export const DeleteWeightsSchema = z.object({
  confirmName: z.string().min(1).max(200),
});

export type DeleteWeightsDto = z.infer<typeof DeleteWeightsSchema>;
