import { z } from "zod";
import { LocalModelRole } from "../../../generated/prisma";

export const assignRoleSchema = z.object({
  modelId: z
    .string()
    .min(1, "Model ID is required")
    .max(255, "Model ID must be at most 255 characters"),
  role: z.nativeEnum(LocalModelRole),
});

export type AssignRoleDto = z.infer<typeof assignRoleSchema>;
