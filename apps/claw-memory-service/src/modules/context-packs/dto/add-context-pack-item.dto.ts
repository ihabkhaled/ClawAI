import { z } from "zod";

export const addContextPackItemSchema = z.object({
  type: z.string().min(1, "Type is required").max(50, "Type must be at most 50 characters"),
  content: z.string().max(50000, "Content must be at most 50000 characters").optional(),
  fileId: z.string().max(255, "File ID must be at most 255 characters").optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
});

export type AddContextPackItemDto = z.infer<typeof addContextPackItemSchema>;
