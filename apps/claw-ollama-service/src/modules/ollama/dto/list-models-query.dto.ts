import { z } from "zod";
import { RuntimeType } from "../../../generated/prisma";

export const listModelsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  runtime: z.nativeEnum(RuntimeType).optional(),
  isInstalled: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
});

export type ListModelsQueryDto = z.infer<typeof listModelsQuerySchema>;
