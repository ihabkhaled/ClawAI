import { z } from 'zod';

export const cloneTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
});

export type CloneTemplateDto = z.infer<typeof cloneTemplateSchema>;
