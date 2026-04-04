import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const createMessageSchema = z.object({
  threadId: z.string().max(255, "Thread ID must be at most 255 characters"),
  content: z.string().min(1, "Content must not be empty").max(100000, "Content must be at most 100000 characters"),
  routingMode: z.nativeEnum(RoutingMode).optional(),
});

export type CreateMessageDto = z.infer<typeof createMessageSchema>;
