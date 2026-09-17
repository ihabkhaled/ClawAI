import { vi, type Mock } from 'vitest';
import { WorkspaceConnectorService } from '../workspace-connector.service';
import { EntityNotFoundException } from '../../../../common/errors/entity-not-found.exception';
import { BusinessException } from '../../../../common/errors/business.exception';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { WorkspaceErrorCode } from '../../../../common/enums/workspace-error-code.enum';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { OAuthTokenManager } from '../../managers/oauth-token.manager';
import type { WorkspaceHealthManager } from '../../managers/workspace-health.manager';
import type { WorkspaceSyncManager } from '../../managers/workspace-sync.manager';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { ProviderAppConfigService } from '../provider-app-config.service';
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
  create: vi.fn().mockResolvedValue(mockConnectorWithStats),
  createWithinLimit: vi.fn().mockResolvedValue(mockConnectorWithStats),
  findById: vi.fn(),
  findByIdWithStats: vi.fn().mockResolvedValue(mockConnectorWithStats),
  findAllByUser: vi.fn(),
  update: vi.fn().mockResolvedValue(mockConnectorWithStats),
  delete: vi.fn().mockResolvedValue(mockConnectorWithStats),
  createSyncRun: vi.fn(),
  updateSyncRun: vi.fn(),
  createHealthEvent: vi.fn(),
  findLatestHealthEvent: vi.fn(),
  findInFlightRun: vi.fn().mockResolvedValue(null),
  updateCadence: vi.fn(),
  markPaused: vi.fn(),
  markResumed: vi.fn(),
  markDegraded: vi.fn(),
  markTick: vi.fn(),
} as unknown as WorkspaceConnectorRepository;

const mockAdapter = {
  getAuthorizationBaseUrl: vi.fn().mockReturnValue('https://auth.example.com'),
  getClientId: vi.fn().mockReturnValue('client-id'),
  getDefaultScopes: vi.fn().mockReturnValue(['read']),
};
const mockAdapterFactory = {
  getAdapter: vi.fn().mockReturnValue(mockAdapter),
} as unknown as WorkspaceAdapterFactory;
const mockTokenManager = {
  encryptTokenSet: vi.fn().mockReturnValue('encrypted'),
  decryptTokenSet: vi.fn(),
  initOAuthFlow: vi
    .fn()
    .mockResolvedValue({ authorizationUrl: 'https://auth?state=abc', state: 'abc' }),
  resolveOAuthState: vi.fn(),
} as unknown as OAuthTokenManager;
const mockHealthManager = { checkHealth: vi.fn() } as unknown as WorkspaceHealthManager;
const mockSyncManager = { syncConnector: vi.fn() } as unknown as WorkspaceSyncManager;
const mockRabbitMQ = {
  publish: vi.fn().mockImplementation(() => Promise.resolve()),
} as unknown as RabbitMQService;
const mockProviderAppConfigs = {
  getById: vi.fn().mockResolvedValue({
    id: 'cfg-1',
    provider: WorkspaceProvider.GITHUB,
    authMode: 'OAUTH2',
    status: 'READY',
    publicConfig: { clientId: 'gh-id' },
    secretVersion: 1,
    name: 'default',
  }),
  getDecryptedSecret: vi.fn().mockResolvedValue({ clientSecret: 'gh-secret' }),
} as unknown as ProviderAppConfigService;

describe('WorkspaceConnectorService', () => {
  let service: WorkspaceConnectorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkspaceConnectorService(
      mockRepo,
      mockAdapterFactory,
      mockTokenManager,
      mockHealthManager,
      mockSyncManager,
      mockProviderAppConfigs,
      mockRabbitMQ,
      { resolve: vi.fn().mockResolvedValue({ isAdmin: true }) } as never,
    );
  });

  describe('create', () => {
    it('rejects OAuth provider without accessToken (must go through OAuth flow)', async () => {
      const dto = {
        name: 'Test',
        provider: WorkspaceProvider.GITHUB,
        permissionLevel: WorkspacePermissionLevel.READ,
        scopes: [],
      };
      const promise = service.create('u1', dto);
      await expect(promise).rejects.toThrow(BusinessException);
      await expect(promise).rejects.toMatchObject({ code: WorkspaceErrorCode.OAUTH_REQUIRED });
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('accepts OAuth provider when an accessToken is supplied (admin/test path)', async () => {
      const dto = {
        name: 'Test',
        provider: WorkspaceProvider.GITHUB,
        permissionLevel: WorkspacePermissionLevel.READ,
        scopes: [],
        accessToken: 'tok',
      };
      const result = await service.create('u1', dto);
      expect(result).toBeDefined();
      expect(mockRepo.createWithinLimit).toHaveBeenCalled();
    });

    it('rejects creation when the atomic workspace connection limit is exhausted', async () => {
      (mockRepo.createWithinLimit as Mock).mockResolvedValueOnce(null);

      await expect(
        service.create('u1', {
          name: 'Blocked',
          provider: WorkspaceProvider.GITHUB,
          permissionLevel: WorkspacePermissionLevel.READ,
          scopes: [],
          accessToken: 'tok',
        }),
      ).rejects.toMatchObject({ code: 'PLAN_WORKSPACE_CONNECTION_LIMIT_EXCEEDED', status: 429 });
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
      (mockRepo.findByIdWithStats as Mock).mockResolvedValue(null);
      await expect(service.getConnector('missing', 'u1')).rejects.toThrow(EntityNotFoundException);
    });

    it('should throw BusinessException FORBIDDEN when userId mismatch', async () => {
      (mockRepo.findByIdWithStats as Mock).mockResolvedValue({
        ...mockConnectorWithStats,
        userId: 'other-user',
      });
      await expect(service.getConnector('c1', 'u1')).rejects.toThrow(
        expect.objectContaining({ getStatus: expect.any(Function) }),
      );
    });

    it('should return connector when user matches', async () => {
      (mockRepo.findByIdWithStats as Mock).mockResolvedValue(mockConnectorWithStats);
      const result = await service.getConnector('c1', 'u1');
      expect(result.id).toBe('c1');
    });
  });

  describe('delete', () => {
    it('should delete and return connector', async () => {
      (mockRepo.findByIdWithStats as Mock).mockResolvedValue(mockConnectorWithStats);
      const result = await service.delete('c1', 'u1');
      expect(mockRepo.delete).toHaveBeenCalledWith('c1');
      expect(result).toBeDefined();
    });
  });

  describe('triggerSync', () => {
    it('should throw CONFLICT when status is PENDING_AUTH', async () => {
      (mockRepo.findByIdWithStats as Mock).mockResolvedValue({
        ...mockConnectorWithStats,
        status: WorkspaceConnectorStatus.PENDING_AUTH,
      });
      await expect(service.triggerSync('c1', 'u1', { delta: false })).rejects.toThrow(
        expect.objectContaining({ code: 'NOT_AUTHORIZED' }),
      );
    });

    it('should call syncManager when status allows', async () => {
      (mockRepo.findByIdWithStats as Mock).mockResolvedValue(mockConnectorWithStats);
      (mockRepo.findInFlightRun as Mock).mockResolvedValue(null);
      (mockSyncManager.syncConnector as Mock).mockResolvedValue({
        objectsFound: 5,
        objectsSynced: 5,
        objectsFailed: 0,
      });
      await service.triggerSync('c1', 'u1', { delta: false });
      expect(mockSyncManager.syncConnector).toHaveBeenCalled();
    });
  });

  describe('initOAuth', () => {
    it('should call tokenManager initOAuthFlow and return result for OAuth providers', async () => {
      (mockProviderAppConfigs.getById as Mock).mockResolvedValueOnce({
        id: 'cfg-1',
        provider: WorkspaceProvider.SLACK,
        authMode: 'OAUTH2',
        status: 'READY',
        publicConfig: { clientId: 'slack-id' },
        secretVersion: 1,
        name: 'default',
      });
      const dto = {
        provider: WorkspaceProvider.SLACK,
        providerAppConfigId: 'cfg-1',
        redirectUri: 'https://app/cb',
        scopes: [],
      };
      const result = await service.initOAuth('u1', dto);
      expect(result.authorizationUrl).toBeDefined();
      expect(result.state).toBeDefined();
    });

    it('should throw when config provider mismatches requested provider', async () => {
      (mockProviderAppConfigs.getById as Mock).mockResolvedValueOnce({
        id: 'cfg-1',
        provider: WorkspaceProvider.GITHUB,
        authMode: 'OAUTH2',
        status: 'READY',
        publicConfig: { clientId: 'gh-id' },
        secretVersion: 1,
        name: 'default',
      });
      const dto = {
        provider: WorkspaceProvider.SLACK,
        providerAppConfigId: 'cfg-1',
        redirectUri: 'https://app/cb',
        scopes: [],
      };
      await expect(service.initOAuth('u1', dto)).rejects.toThrow(BusinessException);
    });
  });

  describe('handleOAuthCallback', () => {
    it('should throw when state is invalid', async () => {
      (mockTokenManager.resolveOAuthState as Mock).mockResolvedValue(null);
      await expect(
        service.handleOAuthCallback('u1', { code: 'c', state: 'bad', redirectUri: 'https://cb' }),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when userId does not match state', async () => {
      (mockTokenManager.resolveOAuthState as Mock).mockResolvedValue({
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
      (mockTokenManager.resolveOAuthState as Mock).mockResolvedValue({
        userId: 'u1',
        provider: 'GITHUB',
        redirectUri: 'https://cb',
        verifier: 'v',
      });
      (mockAdapter as any).exchangeCodeForTokens = vi
        .fn()
        .mockResolvedValue({ accessToken: 'tok', scopes: ['repo'] });
      await service.handleOAuthCallback('u1', {
        code: 'code123',
        state: 'valid',
        redirectUri: 'https://cb',
      });
      expect(mockRepo.createWithinLimit).toHaveBeenCalled();
    });
  });
});
