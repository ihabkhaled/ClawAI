import { z } from "zod";
import { UserRole } from "../../../common/enums";
import { UserStatus } from "../../../common/enums";

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(255, "Search must be at most 255 characters").optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  sortBy: z
    .enum(["createdAt", "email", "username", "role", "status"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type ListUsersQueryDto = z.infer<typeof listUsersQuerySchema>;
