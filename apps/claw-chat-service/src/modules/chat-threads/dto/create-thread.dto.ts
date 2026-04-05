import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const createThreadSchema = z.object({
  title: z.string().max(255, "Title must be at most 255 characters").optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  systemPrompt: z.string().max(10000, "System prompt must be at most 10000 characters").optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
