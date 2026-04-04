import { z } from "zod";
import { MemoryType } from "../../../generated/prisma";

export const createMemorySchema = z.object({
  type: z.nativeEnum(MemoryType),
  content: z.string().min(1, "Content is required").max(50000, "Content must be at most 50000 characters"),
  sourceThreadId: z.string().max(255, "Source thread ID must be at most 255 characters").optional(),
  sourceMessageId: z.string().max(255, "Source message ID must be at most 255 characters").optional(),
});

export type CreateMemoryDto = z.infer<typeof createMemorySchema>;
