import {
  WorkspaceProvider,
  WorkspaceProviderAppConfigStatus,
  WorkspaceProviderAuthMode,
} from '../../generated/prisma';
import type { ProviderAppConfigPublic } from '../../modules/workspace/types/provider-config.types';

export function makeProviderAppConfig(
  overrides: Partial<ProviderAppConfigPublic> = {},
): ProviderAppConfigPublic {
  return {
    id: 'cfg-1',
    provider: WorkspaceProvider.GITHUB,
    definitionId: 'def-1',
    name: 'test-config',
    description: null,
    authMode: WorkspaceProviderAuthMode.OAUTH2,
    publicConfig: { clientId: 'test-client-id', redirectUri: 'https://app/cb' },
    secretVersion: 1,
    scopes: ['repo'],
    status: WorkspaceProviderAppConfigStatus.READY,
    lastValidatedAt: null,
    validationError: null,
    createdBy: 'admin-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    hasSecret: true,
    ...overrides,
  };
}
