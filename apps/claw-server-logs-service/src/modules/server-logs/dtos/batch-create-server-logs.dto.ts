import { z } from "zod";
import { createServerLogSchema } from "./create-server-log.dto";

export const batchCreateServerLogsSchema = z.object({
  entries: z.array(createServerLogSchema).min(1).max(100),
});

export type BatchCreateServerLogsDto = z.infer<typeof batchCreateServerLogsSchema>;
