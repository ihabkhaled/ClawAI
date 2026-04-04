import { z } from "zod";

export const testConnectorSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required").max(100),
});

export type TestConnectorDto = z.infer<typeof testConnectorSchema>;
