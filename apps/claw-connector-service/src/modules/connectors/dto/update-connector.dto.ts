import { z } from 'zod';
import { ConnectorAuthType, ConnectorProvider } from '../../../generated/prisma';

export const updateConnectorSchema = z.object({
  name: z.string().min(1).max(100, 'Name must be at most 100 characters').optional(),
  provider: z.nativeEnum(ConnectorProvider).optional(),
  authType: z.nativeEnum(ConnectorAuthType).optional(),
  apiKey: z.string().max(500, 'API key must be at most 500 characters').optional(),
  baseUrl: z.string().max(500, 'Base URL must be at most 500 characters').optional(),
  region: z.string().max(50, 'Region must be at most 50 characters').optional(),
  workspaceId: z.string().max(100, 'Workspace ID must be at most 100 characters').optional(),
  isEnabled: z.boolean().optional(),
  // The PAYG lever (ADR-082). Guarded by ADMIN_CONNECTORS_MANAGE on the route,
  // because flipping it decides whether every future request through this
  // connector debits a user's credit wallet. Optional: omitting it leaves the
  // current classification alone rather than resetting it to the provider
  // default, so an unrelated rename can never silently stop metering.
  isPayAsYouGo: z.boolean().optional(),
});

export type UpdateConnectorDto = z.infer<typeof updateConnectorSchema>;
