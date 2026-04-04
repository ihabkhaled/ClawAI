import { z } from "zod";

export const createContextPackSchema = z.object({
  name: z.string().min(1, "Name is required").max(255, "Name must be at most 255 characters"),
  description: z.string().max(1000, "Description must be at most 1000 characters").optional(),
  scope: z.string().max(255, "Scope must be at most 255 characters").optional(),
});

export type CreateContextPackDto = z.infer<typeof createContextPackSchema>;
