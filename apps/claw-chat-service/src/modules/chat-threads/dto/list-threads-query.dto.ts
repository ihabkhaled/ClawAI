import { z } from "zod";

export const listThreadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255, "Search must be at most 255 characters").optional(),
  isPinned: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  isArchived: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "title"]).default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListThreadsQueryDto = z.infer<typeof listThreadsQuerySchema>;
