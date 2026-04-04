import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const updatePolicySchema = z.object({
  name: z
    .string()
    .min(1)
    .max(255, "Name must be at most 255 characters")
    .optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  config: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

export type UpdatePolicyDto = z.infer<typeof updatePolicySchema>;
