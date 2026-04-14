import { WorkspaceSyncManager } from '../workspace-sync.manager';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { OAuthTokenManager } from '../oauth-token.manager';
import type { WorkspaceConnector } from '../../../../generated/prisma';
import { WorkspaceSyncStatus } from '../../../../common/enums/workspace-sync-status.enum';

const mockConnector = {
  id: 'c1',
  userId: 'u1',
  name: 'Test Connector',
  provider: 'GITHUB',
  status: 'CONNECTED',
  encryptedTokens: null,
  deltaToken: null,
  isEnabled: true,
  permissionLevel: 'READ',
  scopes: [],
  expiresAt: null,
  lastSyncAt: null,
  webhookId: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as WorkspaceConnector;

const mockAdapter = {
  syncObjects: jest.fn(),
};

const mockAdapterFactory = {
  getAdapter: jest.fn().mockReturnValue(mockAdapter),
} as unknown as WorkspaceAdapterFactory;

const mockRepo = {
  createSyncRun: jest.fn().mockResolvedValue({ id: 'run1' }),
  updateSyncRun: jest.fn().mockResolvedValue({}),
  update: jest.fn().mockResolvedValue({}),
} as unknown as WorkspaceConnectorRepository;

const mockTokenManager = {
  decryptTokenSet: jest.fn().mockReturnValue({ accessToken: 'tok', scopes: [] }),
} as unknown as OAuthTokenManager;

describe('WorkspaceSyncManager', () => {
  let manager: WorkspaceSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WorkspaceSyncManager(mockRepo, mockAdapterFactory, mockTokenManager);
  });

  describe('syncConnector', () => {
    it('should return successful sync result', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 10,
        objectsSynced: 10,
        objectsFailed: 0,
      });
      const result = await manager.syncConnector(mockConnector, false);
      expect(result.objectsSynced).toBe(10);
      expect(result.errorMessage).toBeUndefined();
    });

    it('should update sync run with COMPLETED on success', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 5,
        objectsSynced: 5,
        objectsFailed: 0,
      });
      await manager.syncConnector(mockConnector, false);
      expect(mockRepo.updateSyncRun).toHaveBeenCalledWith(
        'run1',
        expect.objectContaining({ status: WorkspaceSyncStatus.COMPLETED }),
      );
    });

    it('should return error result after 3 retries', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockRejectedValue(new Error('Rate limit'));
      const result = await manager.syncConnector(mockConnector, false);
      expect(result.errorMessage).toContain('Rate limit');
      expect(mockAdapter.syncObjects).toHaveBeenCalledTimes(3);
    });

    it('should update sync run with FAILED on all retries exhausted', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockRejectedValue(new Error('fail'));
      await manager.syncConnector(mockConnector, false);
      expect(mockRepo.updateSyncRun).toHaveBeenCalledWith(
        'run1',
        expect.objectContaining({ status: WorkspaceSyncStatus.FAILED }),
      );
    });

    it('should update deltaToken when sync returns one', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 3,
        objectsSynced: 3,
        objectsFailed: 0,
        deltaTokenOut: 'dt-next',
      });
      await manager.syncConnector(mockConnector, true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ deltaToken: 'dt-next' }),
      );
    });

    it('should use null accessToken when encryptedTokens is null', async () => {
      const connectorNoTokens = { ...mockConnector, encryptedTokens: null };
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 0,
        objectsSynced: 0,
        objectsFailed: 0,
      });
      await manager.syncConnector(connectorNoTokens, false);
      expect(mockTokenManager.decryptTokenSet).not.toHaveBeenCalled();
    });
  });
});
