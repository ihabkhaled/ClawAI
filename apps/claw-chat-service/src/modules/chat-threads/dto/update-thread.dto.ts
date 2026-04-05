import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const updateThreadSchema = z.object({
  title: z.string().max(255, "Title must be at most 255 characters").optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  systemPrompt: z.string().max(10000, "System prompt must be at most 10000 characters").optional().nullable(),
  temperature: z.number().min(0).max(2).optional().nullable(),
  maxTokens: z.number().int().min(1).max(32000).optional().nullable(),
});

export type UpdateThreadDto = z.infer<typeof updateThreadSchema>;
