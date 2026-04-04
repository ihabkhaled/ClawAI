import { z } from "zod";
import { UserRole } from "../../../common/enums";
import { UserStatus } from "../../../common/enums";

export const updateUserSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email must be at most 255 characters").optional(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens, and underscores")
    .optional(),
  role: z.nativeEnum(UserRole).optional(),
  status: z.nativeEnum(UserStatus).optional(),
});

export type UpdateUserDto = z.infer<typeof updateUserSchema>;
