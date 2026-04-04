import { z } from "zod";

export const updateMemorySchema = z.object({
  content: z.string().min(1, "Content is required").max(50000, "Content must be at most 50000 characters").optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateMemoryDto = z.infer<typeof updateMemorySchema>;
