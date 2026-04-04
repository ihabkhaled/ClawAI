import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const evaluateRouteSchema = z.object({
  messageContent: z
    .string()
    .min(1, "Message content is required")
    .max(100000, "Message content must be at most 100000 characters"),
  threadId: z.string().max(255, "Thread ID must be at most 255 characters").optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  forcedModel: z
    .string()
    .max(255, "Forced model must be at most 255 characters")
    .optional(),
});

export type EvaluateRouteDto = z.infer<typeof evaluateRouteSchema>;
