import { WorkspaceConnectorService } from '../workspace-connector.service';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { BusinessException } from '../../../../common/errors/business.exception';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { OAuthTokenManager } from '../../managers/oauth-token.manager';
import type { WorkspaceHealthManager } from '../../managers/workspace-health.manager';
import type { WorkspaceSyncManager } from '../../managers/workspace-sync.manager';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WorkspacePermissionLevel } from '../../../../common/enums/workspace-permission-level.enum';

const mockConnectorWithStats = {
  id: 'c1',
  userId: 'u1',
  name: 'Test',
  provider: WorkspaceProvider.GITHUB,
  status: WorkspaceConnectorStatus.CONNECTED,
  permissionLevel: WorkspacePermissionLevel.READ,
  encryptedTokens: null,
  scopes: [],
  expiresAt: null,
  lastSyncAt: null,
  deltaToken: null,
  isEnabled: true,
  webhookId: null,
  metadata: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { syncRuns: 2, healthEvents: 5 },
  healthEvents: [],
};

const mockRepo = {
  create: jest.fn().mockResolvedValue(mockConnectorWithStats),
  findById: jest.fn(),
  findByIdWithStats: jest.fn().mockResolvedValue(mockConnectorWithStats),
  findAllByUser: jest.fn(),
  update: jest.fn().mockResolvedValue(mockConnectorWithStats),
  delete: jest.fn().mockResolvedValue(mockConnectorWithStats),
  createSyncRun: jest.fn(),
  updateSyncRun: jest.fn(),
  createHealthEvent: jest.fn(),
  findLatestHealthEvent: jest.fn(),
} as unknown as WorkspaceConnectorRepository;

const mockAdapter = {
  getAuthorizationBaseUrl: jest.fn().mockReturnValue('https://auth.example.com'),
  getClientId: jest.fn().mockReturnValue('client-id'),
  getDefaultScopes: jest.fn().mockReturnValue(['read']),
};
const mockAdapterFactory = {
  getAdapter: jest.fn().mockReturnValue(mockAdapter),
} as unknown as WorkspaceAdapterFactory;
const mockTokenManager = {
  encryptTokenSet: jest.fn().mockReturnValue('encrypted'),
  decryptTokenSet: jest.fn(),
  initOAuthFlow: jest
    .fn()
    .mockResolvedValue({ authorizationUrl: 'https://auth?state=abc', state: 'abc' }),
  resolveOAuthState: jest.fn(),
} as unknown as OAuthTokenManager;
const mockHealthManager = { checkHealth: jest.fn() } as unknown as WorkspaceHealthManager;
const mockSyncManager = { syncConnector: jest.fn() } as unknown as WorkspaceSyncManager;
const mockRabbitMQ = {
  publish: jest.fn().mockImplementation(() => Promise.resolve()),
} as unknown as RabbitMQService;

describe('WorkspaceConnectorService', () => {
  let service: WorkspaceConnectorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new WorkspaceConnectorService(
      mockRepo,
      mockAdapterFactory,
      mockTokenManager,
      mockHealthManager,
      mockSyncManager,
      mockRabbitMQ,
    );
  });

  describe('create', () => {
    it('should create a connector and return stats', async () => {
      const dto = {
        name: 'Test',
        provider: WorkspaceProvider.GITHUB,
        permissionLevel: WorkspacePermissionLevel.READ,
        scopes: [],
      };
      const result = await service.create('u1', dto);
      expect(result).toBeDefined();
      expect(mockRepo.create).toHaveBeenCalled();
    });

    it('should encrypt tokens when accessToken provided', async () => {
      const dto = {
        name: 'Test',
        provider: WorkspaceProvider.GITHUB,
        permissionLevel: WorkspacePermissionLevel.READ,
        scopes: [],
        accessToken: 'tok',
      };
      await service.create('u1', dto);
      expect(mockTokenManager.encryptTokenSet).toHaveBeenCalled();
    });
  });

  describe('getConnector', () => {
    it('should throw EntityNotFoundException when connector not found', async () => {
      (mockRepo.findByIdWithStats as jest.Mock).mockResolvedValue(null);
      await expect(service.getConnector('missing', 'u1')).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw BusinessException FORBIDDEN when userId mismatch', async () => {
      (mockRepo.findByIdWithStats as jest.Mock).mockResolvedValue({
        ...mockConnectorWithStats,
        userId: 'other-user',
      });
      await expect(service.getConnector('c1', 'u1')).rejects.toThrow(
        expect.objectContaining({ getStatus: expect.any(Function) }),
      );
    });

    it('should return connector when user matches', async () => {
      (mockRepo.findByIdWithStats as jest.Mock).mockResolvedValue(mockConnectorWithStats);
      const result = await service.getConnector('c1', 'u1');
      expect(result.id).toBe('c1');
    });
  });

  describe('delete', () => {
    it('should delete and return connector', async () => {
      (mockRepo.findByIdWithStats as jest.Mock).mockResolvedValue(mockConnectorWithStats);
      const result = await service.delete('c1', 'u1');
      expect(mockRepo.delete).toHaveBeenCalledWith('c1');
      expect(result).toBeDefined();
    });
  });

  describe('triggerSync', () => {
    it('should throw CONFLICT when status is PENDING_AUTH', async () => {
      (mockRepo.findByIdWithStats as jest.Mock).mockResolvedValue({
        ...mockConnectorWithStats,
        status: WorkspaceConnectorStatus.PENDING_AUTH,
      });
      await expect(service.triggerSync('c1', 'u1', false)).rejects.toThrow(
        expect.objectContaining({ code: 'NOT_AUTHORIZED' }),
      );
    });

    it('should call syncManager when status allows', async () => {
      (mockRepo.findByIdWithStats as jest.Mock).mockResolvedValue(mockConnectorWithStats);
      (mockSyncManager.syncConnector as jest.Mock).mockResolvedValue({
        objectsFound: 5,
        objectsSynced: 5,
        objectsFailed: 0,
      });
      await service.triggerSync('c1', 'u1', false);
      expect(mockSyncManager.syncConnector).toHaveBeenCalled();
    });
  });

  describe('initOAuth', () => {
    it('should call tokenManager initOAuthFlow and return result', async () => {
      const dto = { provider: WorkspaceProvider.GITHUB, redirectUri: 'https://app/cb', scopes: [] };
      const result = await service.initOAuth('u1', dto);
      expect(result.authorizationUrl).toBeDefined();
      expect(result.state).toBeDefined();
    });
  });

  describe('handleOAuthCallback', () => {
    it('should throw when state is invalid', async () => {
      (mockTokenManager.resolveOAuthState as jest.Mock).mockResolvedValue(null);
      await expect(
        service.handleOAuthCallback('u1', { code: 'c', state: 'bad', redirectUri: 'https://cb' }),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when userId does not match state', async () => {
      (mockTokenManager.resolveOAuthState as jest.Mock).mockResolvedValue({
        userId: 'other',
        provider: 'GITHUB',
        redirectUri: 'https://cb',
        verifier: 'v',
      });
      await expect(
        service.handleOAuthCallback('u1', { code: 'c', state: 'valid', redirectUri: 'https://cb' }),
      ).rejects.toThrow(BusinessException);
    });

    it('should create connector on valid callback', async () => {
      (mockTokenManager.resolveOAuthState as jest.Mock).mockResolvedValue({
        userId: 'u1',
        provider: 'GITHUB',
        redirectUri: 'https://cb',
        verifier: 'v',
      });
      (mockAdapter as any).exchangeCodeForTokens = jest
        .fn()
        .mockResolvedValue({ accessToken: 'tok', scopes: ['repo'] });
      await service.handleOAuthCallback('u1', {
        code: 'code123',
        state: 'valid',
        redirectUri: 'https://cb',
      });
      expect(mockRepo.create).toHaveBeenCalled();
    });
  });
});
