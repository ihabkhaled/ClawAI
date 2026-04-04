import { z } from "zod";
import { MemoryType } from "../../../generated/prisma";

export const listMemoriesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.nativeEnum(MemoryType).optional(),
  isEnabled: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().max(255, "Search must be at most 255 characters").optional(),
});

export type ListMemoriesQueryDto = z.infer<typeof listMemoriesQuerySchema>;
