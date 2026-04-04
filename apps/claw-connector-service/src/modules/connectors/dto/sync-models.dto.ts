import { z } from "zod";

export const syncModelsSchema = z.object({
  connectorId: z.string().min(1, "Connector ID is required").max(100),
});

export type SyncModelsDto = z.infer<typeof syncModelsSchema>;
