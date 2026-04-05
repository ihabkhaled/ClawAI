import { z } from 'zod';

const runtimeValues = ['ollama', 'llamacpp', 'vllm', 'lmstudio'] as const;

const modelRoleValues = ['ROUTER', 'FALLBACK', 'REASONING', 'CODING'] as const;

export const pullModelSchema = z.object({
  modelName: z
    .string()
    .min(1, 'Model name is required')
    .max(255, 'Model name must be at most 255 characters'),
  runtime: z.enum(runtimeValues, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid runtime',
    }),
  }),
});

export const assignRoleSchema = z.object({
  modelId: z
    .string()
    .min(1, 'Model ID is required')
    .max(255, 'Model ID must be at most 255 characters'),
  role: z.enum(modelRoleValues, {
    errorMap: (): { message: string } => ({
      message: 'Please select a valid role',
    }),
  }),
});

export type PullModelInput = z.infer<typeof pullModelSchema>;
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;
