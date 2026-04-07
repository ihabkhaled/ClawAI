import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const createThreadSchema = z.object({
  title: z.string().max(255, "Title must be at most 255 characters").optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  systemPrompt: z.string().max(10000, "System prompt must be at most 10000 characters").optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().int().min(1).max(32000).optional(),
  preferredProvider: z.string().max(50, "Preferred provider must be at most 50 characters").optional(),
  preferredModel: z.string().max(255, "Preferred model must be at most 255 characters").optional(),
  contextPackIds: z.array(z.string().max(255)).max(10, "Maximum 10 context packs").optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
