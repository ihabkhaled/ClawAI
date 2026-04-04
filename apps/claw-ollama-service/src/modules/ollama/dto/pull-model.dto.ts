import { z } from "zod";
import { RuntimeType } from "../../../generated/prisma";

export const pullModelSchema = z.object({
  modelName: z
    .string()
    .min(1, "Model name is required")
    .max(255, "Model name must be at most 255 characters"),
  runtime: z.nativeEnum(RuntimeType),
});

export type PullModelDto = z.infer<typeof pullModelSchema>;
