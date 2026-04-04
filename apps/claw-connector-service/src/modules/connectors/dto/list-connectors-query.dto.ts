import { z } from "zod";
import { ConnectorProvider, ConnectorStatus } from "../../../generated/prisma";

export const listConnectorsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  provider: z.nativeEnum(ConnectorProvider).optional(),
  status: z.nativeEnum(ConnectorStatus).optional(),
  isEnabled: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().max(255, "Search must be at most 255 characters").optional(),
});

export type ListConnectorsQueryDto = z.infer<typeof listConnectorsQuerySchema>;
