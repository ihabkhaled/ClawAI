import { TokenRefreshManager } from '../token-refresh.manager';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { AppConfig } from '../../../../app/config/app.config';
import type { OAuthTokenManager } from '../oauth-token.manager';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { ProviderAppConfigService } from '../../services/provider-app-config.service';
import type { WorkspaceConnector } from '../../../../generated/prisma';

const TEST_KEY = 'a'.repeat(64);

jest.spyOn(AppConfig, 'get').mockReturnValue({
  WORKSPACE_DATABASE_URL: 'postgres://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: TEST_KEY,
  WORKSPACE_PORT: 4014,
  WORKSPACE_SCHEDULER_ENABLED: false,
  WORKSPACE_SCHEDULER_TICK_CRON: '* * * * * *',
  WORKSPACE_SYNC_STALE_DETECTOR_CRON: '* * * * * *',
  WORKSPACE_SYNC_STALE_MULTIPLIER: 3,
  WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS: 600,
  WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL: 20,
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER: 5,
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR: 1,
  WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS: 3,
  WORKSPACE_SYNC_RETRY_BASE_MS: 1000,
  WORKSPACE_SYNC_RETRY_JITTER_MS: 500,
  WORKSPACE_SYNC_DLQ_ROUTING_PREFIX: 'workspace.sync.dlq',
  GITHUB_CLIENT_ID: 'gh-id',
  GITHUB_CLIENT_SECRET: 'gh-secret',
  SLACK_CLIENT_ID: 'sl-id',
  SLACK_CLIENT_SECRET: 'sl-secret',
  JIRA_CLIENT_ID: 'jira-id',
  JIRA_CLIENT_SECRET: 'jira-secret',
  GOOGLE_CLIENT_ID: 'goog-id',
  GOOGLE_CLIENT_SECRET: 'goog-secret',
} as any);

const buildConnector = (overrides: Partial<WorkspaceConnector> = {}): WorkspaceConnector =>
  ({
    id: 'conn-1',
    userId: 'user-1',
    provider: 'GMAIL',
    encryptedTokens: null,
    expiresAt: null,
    providerAppConfigId: null,
    status: WorkspaceConnectorStatus.CONNECTED,
    ...overrides,
  }) as WorkspaceConnector;

describe('TokenRefreshManager', () => {
  let manager: TokenRefreshManager;
  let mockRepository: jest.Mocked<WorkspaceConnectorRepository>;
  let mockAdapterFactory: jest.Mocked<WorkspaceAdapterFactory>;
  let mockTokenManager: jest.Mocked<OAuthTokenManager>;
  let mockProviderAppConfigs: jest.Mocked<ProviderAppConfigService>;

  beforeEach(() => {
    mockRepository = { update: jest.fn().mockResolvedValue({}) } as any;
    mockAdapterFactory = { getAdapter: jest.fn() } as any;
    mockTokenManager = {
      decryptTokenSet: jest.fn(),
      encryptTokenSet: jest.fn(),
      isTokenExpired: jest.fn(),
      acquireRefreshLock: jest.fn(),
      releaseRefreshLock: jest.fn(),
      logTokenRefresh: jest.fn(),
    } as any;
    mockProviderAppConfigs = {
      getById: jest.fn(),
      getDecryptedSecret: jest.fn(),
    } as any;

    manager = new TokenRefreshManager(
      mockRepository,
      mockAdapterFactory,
      mockTokenManager,
      mockProviderAppConfigs,
    );
  });

  describe('getValidAccessToken', () => {
    it('returns null when no encryptedTokens', async () => {
      const connector = buildConnector({ encryptedTokens: null });
      const result = await manager.getValidAccessToken(connector);
      expect(result).toBeNull();
      expect(mockTokenManager.decryptTokenSet).not.toHaveBeenCalled();
    });

    it('returns existing accessToken when token is not expired', async () => {
      const connector = buildConnector({ encryptedTokens: 'encrypted' });
      mockTokenManager.decryptTokenSet.mockReturnValue({
        accessToken: 'valid_token',
        scopes: [],
      });
      mockTokenManager.isTokenExpired.mockReturnValue(false);

      const result = await manager.getValidAccessToken(connector);
      expect(result).toBe('valid_token');
      expect(mockAdapterFactory.getAdapter).not.toHaveBeenCalled();
    });

    it('marks connector DISCONNECTED and throws when token expired with no refreshToken', async () => {
      const connector = buildConnector({ encryptedTokens: 'encrypted' });
      mockTokenManager.decryptTokenSet.mockReturnValue({
        accessToken: 'expired',
        scopes: [],
      });
      mockTokenManager.isTokenExpired.mockReturnValue(true);

      await expect(manager.getValidAccessToken(connector)).rejects.toThrow('re-authorization');
      expect(mockRepository.update).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({ status: WorkspaceConnectorStatus.DISCONNECTED }),
      );
    });

    it('returns stale token when refresh lock is busy (prevents stampede)', async () => {
      const connector = buildConnector({ encryptedTokens: 'encrypted' });
      mockTokenManager.decryptTokenSet.mockReturnValue({
        accessToken: 'stale_token',
        refreshToken: 'refresh_tok',
        scopes: [],
      });
      mockTokenManager.isTokenExpired.mockReturnValue(true);
      mockTokenManager.acquireRefreshLock.mockResolvedValue(false);

      const result = await manager.getValidAccessToken(connector);
      expect(result).toBe('stale_token');
      expect(mockAdapterFactory.getAdapter).not.toHaveBeenCalled();
    });

    it('refreshes token, persists new tokens, returns new accessToken', async () => {
      const connector = buildConnector({ encryptedTokens: 'encrypted' });
      const future = new Date(Date.now() + 3600 * 1000);
      mockTokenManager.decryptTokenSet.mockReturnValue({
        accessToken: 'old_token',
        refreshToken: 'refresh_tok',
        scopes: ['openid'],
      });
      mockTokenManager.isTokenExpired.mockReturnValue(true);
      mockTokenManager.acquireRefreshLock.mockResolvedValue(true);
      mockTokenManager.encryptTokenSet.mockReturnValue('new_encrypted');

      const mockAdapter = {
        refreshTokens: jest.fn().mockResolvedValue({
          accessToken: 'new_token',
          refreshToken: 'new_refresh',
          expiresAt: future,
          scopes: [],
        }),
      };
      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter as any);

      const result = await manager.getValidAccessToken(connector);
      expect(result).toBe('new_token');
      expect(mockRepository.update).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          encryptedTokens: 'new_encrypted',
          expiresAt: future,
          status: WorkspaceConnectorStatus.CONNECTED,
        }),
      );
      expect(mockTokenManager.releaseRefreshLock).toHaveBeenCalledWith('conn-1');
    });

    it('marks DISCONNECTED and releases lock when refresh fails', async () => {
      const connector = buildConnector({ encryptedTokens: 'encrypted' });
      mockTokenManager.decryptTokenSet.mockReturnValue({
        accessToken: 'old',
        refreshToken: 'refresh',
        scopes: [],
      });
      mockTokenManager.isTokenExpired.mockReturnValue(true);
      mockTokenManager.acquireRefreshLock.mockResolvedValue(true);

      const mockAdapter = {
        refreshTokens: jest.fn().mockRejectedValue(new Error('401 Unauthorized')),
      };
      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter as any);

      await expect(manager.getValidAccessToken(connector)).rejects.toThrow(
        'workspace.token_refresh_failed',
      );
      expect(mockRepository.update).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({ status: WorkspaceConnectorStatus.DISCONNECTED }),
      );
      expect(mockTokenManager.releaseRefreshLock).toHaveBeenCalledWith('conn-1');
    });

    it('preserves the existing refreshToken when provider does not return a new one', async () => {
      const connector = buildConnector({ encryptedTokens: 'encrypted' });
      mockTokenManager.decryptTokenSet.mockReturnValue({
        accessToken: 'old',
        refreshToken: 'original_refresh',
        scopes: ['drive'],
      });
      mockTokenManager.isTokenExpired.mockReturnValue(true);
      mockTokenManager.acquireRefreshLock.mockResolvedValue(true);
      mockTokenManager.encryptTokenSet.mockReturnValue('new_encrypted');

      const mockAdapter = {
        refreshTokens: jest.fn().mockResolvedValue({
          accessToken: 'fresh',
          // no refreshToken returned by provider (e.g. Google only rotates occasionally)
          scopes: [],
        }),
      };
      mockAdapterFactory.getAdapter.mockReturnValue(mockAdapter as any);

      await manager.getValidAccessToken(connector);

      expect(mockTokenManager.encryptTokenSet).toHaveBeenCalledWith(
        expect.objectContaining({ refreshToken: 'original_refresh' }),
      );
    });
  });
});
