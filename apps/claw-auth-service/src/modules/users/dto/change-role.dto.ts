import { z } from "zod";
import { UserRole } from "../../../common/enums";

export const changeRoleSchema = z.object({
  role: z.nativeEnum(UserRole),
});

export type ChangeRoleDto = z.infer<typeof changeRoleSchema>;
