import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const listPoliciesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  routingMode: z.nativeEnum(RoutingMode).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

export type ListPoliciesQueryDto = z.infer<typeof listPoliciesQuerySchema>;
