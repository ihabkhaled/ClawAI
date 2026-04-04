import { z } from "zod";
import { UserRole } from "../../../common/enums";

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address").max(255, "Email must be at most 255 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(32, "Username must be at most 32 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Username may only contain letters, numbers, hyphens, and underscores"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password must be at most 128 characters"),
  role: z.nativeEnum(UserRole).optional().default(UserRole.VIEWER),
});

export type CreateUserDto = z.infer<typeof createUserSchema>;
