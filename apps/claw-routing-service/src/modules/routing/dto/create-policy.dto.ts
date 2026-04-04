import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const createPolicySchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must be at most 255 characters"),
  routingMode: z.nativeEnum(RoutingMode),
  priority: z.number().int().min(0).max(1000),
  config: z.record(z.unknown()),
});

export type CreatePolicyDto = z.infer<typeof createPolicySchema>;
