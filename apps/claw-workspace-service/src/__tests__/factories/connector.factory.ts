import type { WorkspaceConnectorWithStats } from '../../modules/workspace/types/workspace.types';
import {
  WorkspaceConnectorStatus,
  WorkspacePermissionLevel,
  type WorkspaceProvider,
} from '../../generated/prisma';

/**
 * Test factory for WorkspaceConnectorWithStats. Defaults are minimal and
 * overridable. Used in service/controller tests to avoid repeating boilerplate.
 */
export function makeConnector(
  overrides: Partial<WorkspaceConnectorWithStats> = {},
): WorkspaceConnectorWithStats {
  return {
    id: 'c1',
    userId: 'u1',
    name: 'Test Connector',
    provider: 'GITHUB' as WorkspaceProvider,
    providerAppConfigId: null,
    authMode: null,
    status: WorkspaceConnectorStatus.CONNECTED,
    statusReason: null,
    permissionLevel: WorkspacePermissionLevel.READ,
    encryptedTokens: null,
    tokenVersion: 0,
    scopes: [],
    expiresAt: null,
    lastSyncAt: null,
    lastAuthAt: null,
    deltaToken: null,
    isEnabled: true,
    webhookId: null,
    metadata: null,
    objectCount: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    syncRuns: [],
    healthEvents: [],
    _count: { objects: 0, syncRuns: 0 },
    ...overrides,
  } as WorkspaceConnectorWithStats;
}
