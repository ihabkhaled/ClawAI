import { z } from "zod";
import { ConnectorProvider, ConnectorAuthType } from "../../../generated/prisma";

export const updateConnectorSchema = z.object({
  name: z.string().min(1).max(100, "Name must be at most 100 characters").optional(),
  provider: z.nativeEnum(ConnectorProvider).optional(),
  authType: z.nativeEnum(ConnectorAuthType).optional(),
  apiKey: z.string().max(500, "API key must be at most 500 characters").optional(),
  baseUrl: z.string().max(500, "Base URL must be at most 500 characters").optional(),
  region: z.string().max(50, "Region must be at most 50 characters").optional(),
  isEnabled: z.boolean().optional(),
});

export type UpdateConnectorDto = z.infer<typeof updateConnectorSchema>;
