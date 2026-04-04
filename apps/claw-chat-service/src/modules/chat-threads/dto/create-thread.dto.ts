import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const createThreadSchema = z.object({
  title: z.string().max(255, "Title must be at most 255 characters").optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
});

export type CreateThreadDto = z.infer<typeof createThreadSchema>;
