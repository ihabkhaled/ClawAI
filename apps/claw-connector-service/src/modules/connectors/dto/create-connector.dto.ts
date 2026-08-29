import { z } from 'zod';
import { ConnectorAuthType, ConnectorProvider } from '../../../generated/prisma';

export const createConnectorSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  provider: z.nativeEnum(ConnectorProvider),
  authType: z.nativeEnum(ConnectorAuthType),
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  baseUrl: z.string().max(500, 'Base URL must be at most 500 characters').optional(),
  region: z.string().max(50, 'Region must be at most 50 characters').optional(),
  workspaceId: z.string().max(100, 'Workspace ID must be at most 100 characters').optional(),
  // Optional override of the provider default (`paygDefaultForProvider`). Left
  // out, an OpenAI connector is created metered and an Ollama connector free.
  // Present, the administrator's answer wins — an Ollama-Cloud connector is
  // exactly the case that needs it.
  isPayAsYouGo: z.boolean().optional(),
});

export type CreateConnectorDto = z.infer<typeof createConnectorSchema>;
