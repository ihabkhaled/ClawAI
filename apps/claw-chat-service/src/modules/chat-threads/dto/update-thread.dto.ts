import { z } from "zod";
import { RoutingMode } from "../../../generated/prisma";

export const updateThreadSchema = z.object({
  title: z.string().max(255, "Title must be at most 255 characters").optional(),
  isPinned: z.boolean().optional(),
  isArchived: z.boolean().optional(),
  routingMode: z.nativeEnum(RoutingMode).optional(),
});

export type UpdateThreadDto = z.infer<typeof updateThreadSchema>;
