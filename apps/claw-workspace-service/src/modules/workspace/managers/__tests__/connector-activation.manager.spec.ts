import { ConnectorActivationManager } from '../connector-activation.manager';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { WorkspaceSyncManager } from '../workspace-sync.manager';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { WorkspaceConnector } from '../../../../generated/prisma';

const buildConnector = (overrides: Partial<WorkspaceConnector> = {}): WorkspaceConnector =>
  ({
    id: 'c1',
    userId: 'u1',
    name: 'GitHub — default',
    provider: WorkspaceProvider.GITHUB,
    status: WorkspaceConnectorStatus.CONNECTED,
    permissionLevel: 'READ',
    encryptedTokens: 'encrypted',
    tokenVersion: 1,
    scopes: ['repo'],
    expiresAt: null,
    lastSyncAt: null,
    lastAuthAt: new Date(),
    deltaToken: null,
    isEnabled: true,
    webhookId: null,
    metadata: null,
    providerAppConfigId: 'cfg-1',
    authMode: 'OAUTH2',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as WorkspaceConnector;

describe('ConnectorActivationManager', () => {
  let repo: { findById: jest.Mock };
  let syncManager: { syncConnector: jest.Mock };
  let rabbit: { subscribe: jest.Mock };
  let manager: ConnectorActivationManager;

  beforeEach(() => {
    repo = { findById: jest.fn() };
    syncManager = { syncConnector: jest.fn().mockResolvedValue(undefined) };
    rabbit = { subscribe: jest.fn().mockResolvedValue(undefined) };
    manager = new ConnectorActivationManager(
      repo as unknown as WorkspaceConnectorRepository,
      syncManager as unknown as WorkspaceSyncManager,
      rabbit as unknown as RabbitMQService,
    );
  });

  describe('onModuleInit', () => {
    it('subscribes to WORKSPACE_CONNECTOR_CREATED', async () => {
      await manager.onModuleInit();
      expect(rabbit.subscribe).toHaveBeenCalledWith(
        'workspace_connector.created',
        expect.any(Function),
      );
    });
  });

  describe('handleConnectorCreated', () => {
    it('ignores malformed payloads', async () => {
      await manager.handleConnectorCreated(null);
      await manager.handleConnectorCreated({});
      expect(repo.findById).not.toHaveBeenCalled();
      expect(syncManager.syncConnector).not.toHaveBeenCalled();
    });

    it('skips when connector is not found', async () => {
      repo.findById.mockResolvedValue(null);
      await manager.handleConnectorCreated({
        connectorId: 'missing',
        provider: 'GITHUB',
        name: 'x',
        userId: 'u1',
      });
      expect(syncManager.syncConnector).not.toHaveBeenCalled();
    });

    it('skips auto-sync when connector has no tokens yet (PENDING_AUTH)', async () => {
      repo.findById.mockResolvedValue(buildConnector({ encryptedTokens: null }));
      await manager.handleConnectorCreated({
        connectorId: 'c1',
        provider: 'GITHUB',
        name: 'x',
        userId: 'u1',
      });
      expect(syncManager.syncConnector).not.toHaveBeenCalled();
    });

    it('triggers first sync when connector has tokens', async () => {
      const connector = buildConnector();
      repo.findById.mockResolvedValue(connector);
      await manager.handleConnectorCreated({
        connectorId: 'c1',
        provider: 'GITHUB',
        name: 'x',
        userId: 'u1',
      });
      // fire-and-forget; wait a tick for the microtask
      await new Promise((r) => setImmediate(r));
      expect(syncManager.syncConnector).toHaveBeenCalledWith(connector, false);
    });

    it('swallows sync errors (they persist as WorkspaceSyncRun status=FAILED)', async () => {
      repo.findById.mockResolvedValue(buildConnector());
      syncManager.syncConnector.mockRejectedValue(new Error('Provider 500'));
      await manager.handleConnectorCreated({
        connectorId: 'c1',
        provider: 'GITHUB',
        name: 'x',
        userId: 'u1',
      });
      await new Promise((r) => setImmediate(r));
      // handler must not throw; syncConnector was attempted
      expect(syncManager.syncConnector).toHaveBeenCalled();
    });
  });
});
