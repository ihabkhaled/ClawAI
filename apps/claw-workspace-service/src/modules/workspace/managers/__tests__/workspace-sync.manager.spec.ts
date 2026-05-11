import { WorkspaceSyncManager } from '../workspace-sync.manager';
import { AppConfig } from '../../../../app/config/app.config';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import type { WorkspaceAdapterFactory } from '../../adapters/workspace-adapter.factory';
import type { TokenRefreshManager } from '../token-refresh.manager';
import type { WorkspaceObjectManager } from '../workspace-object.manager';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { WorkspaceConnector } from '../../../../generated/prisma';
import { WorkspaceSyncStatus } from '../../../../common/enums/workspace-sync-status.enum';

jest.spyOn(AppConfig, 'get').mockReturnValue({
  WORKSPACE_DATABASE_URL: 'postgres://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: 'a'.repeat(64),
  WORKSPACE_PORT: 4014,
  WORKSPACE_SCHEDULER_ENABLED: true,
  WORKSPACE_SCHEDULER_TICK_CRON: '*/30 * * * * *',
  WORKSPACE_SYNC_STALE_DETECTOR_CRON: '*/60 * * * * *',
  WORKSPACE_SYNC_STALE_MULTIPLIER: 3,
  WORKSPACE_SYNC_DEFAULT_INTERVAL_SECONDS: 600,
  WORKSPACE_SYNC_MAX_CONCURRENT_GLOBAL: 20,
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_PROVIDER: 5,
  WORKSPACE_SYNC_MAX_CONCURRENT_PER_CONNECTOR: 1,
  WORKSPACE_SYNC_RETRY_MAX_ATTEMPTS: 3,
  WORKSPACE_SYNC_RETRY_BASE_MS: 1,
  WORKSPACE_SYNC_RETRY_JITTER_MS: 0,
  WORKSPACE_SYNC_DLQ_ROUTING_PREFIX: 'workspace.sync.dlq',
  GITHUB_CLIENT_ID: '',
  GITHUB_CLIENT_SECRET: '',
  SLACK_CLIENT_ID: '',
  SLACK_CLIENT_SECRET: '',
  JIRA_CLIENT_ID: '',
  JIRA_CLIENT_SECRET: '',
  GOOGLE_CLIENT_ID: '',
  GOOGLE_CLIENT_SECRET: '',
  OLLAMA_SERVICE_URL: 'http://ollama-service:4008',
  AI_ACTION_QUEUE_EXPIRY_HOURS: 24,
  AI_ACTION_RISK_AUTO_APPROVE_MAX: 30,
  AI_ACTION_QUEUE_EXPIRY_SWEEP_CRON: '0 */15 * * * *',
  AI_ACTION_QUEUE_EXPIRY_BATCH_LIMIT: 100,
  WEBHOOK_BODY_MAX_BYTES: 1048576,
  WEBHOOK_REPLAY_WINDOW_MINUTES: 30,
  GITHUB_WEBHOOK_SECRET: '',
  GITLAB_WEBHOOK_SECRET: '',
  BITBUCKET_WEBHOOK_SECRET: '',
  JIRA_WEBHOOK_SECRET: '',
  SLACK_SIGNING_SECRET: '',
  FIGMA_WEBHOOK_SECRET: '',
  AUTO_SUGGEST_ENABLED: false,
  AUTO_SUGGEST_JIRA_CRON: '0 */4 * * *',
  AUTO_SUGGEST_GITHUB_STALE_PR_CRON: '0 9 * * *',
  AUTO_SUGGEST_MEETING_NOTES_CRON: '0 */2 * * *',
  AUTO_SUGGEST_PER_USER_DAILY_BUDGET: 50,
  AUTO_SUGGEST_DEDUP_TTL_DAYS: 7,
  AI_ACTION_REQUEST_TIMEOUT_MS: 120_000,
  AI_ACTION_MODEL_RESOLVER_TTL_SECONDS: 300,
  CHAT_SERVICE_URL: 'http://chat-service:4002',
  CONNECTOR_SERVICE_URL: 'http://connector-service:4003',
  MEMORY_SERVICE_URL: 'http://memory-service:4005',
  FILE_SERVICE_URL: 'http://file-service:4006',
  INTER_SERVICE_AUTH_TOKEN: 'test-inter-service-token-32chars-min-aaaa',
  WORKSPACE_GMAIL_FETCH_ATTACHMENTS: false,
  WORKSPACE_GMAIL_MAX_ATTACHMENT_BYTES: 26214400,
  AGENT_SERVICE_URL: 'http://agent-service:4015',
  IMPL_PROMPT_HANDOFF_DEFAULT_MODE: 'CHAT' as const,
  IMPL_PROMPT_PLAN_MAX_SUBTASKS: 12,
  WORKSPACE_SUGGESTION_FACTORY_RATE_PER_HOUR: 100,
  WEBHOOK_CONNECTOR_REQUESTS_PER_MINUTE: 60,
  AUTO_SUGGEST_INBOX_REPLY_CRON: '0 */15 * * * *',
  AUTO_SUGGEST_INBOX_REPLY_LOOKBACK_HOURS: 48,
  AI_ACTION_PER_USER_RATE_PER_MIN: 1000,
  AI_ACTION_PER_USER_RATE_PER_HOUR: 10000,
});

const mockConnector = {
  id: 'c1',
  userId: 'u1',
  name: 'Test Connector',
  provider: 'GITHUB',
  status: 'CONNECTED',
  encryptedTokens: null,
  deltaToken: null,
  objectCount: 0,
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
  updateSyncRun: jest.fn().mockImplementation(() => Promise.resolve({})),
  update: jest.fn().mockImplementation(() => Promise.resolve({})),
  getObjectCount: jest.fn().mockResolvedValue(0),
} as unknown as WorkspaceConnectorRepository;

const mockTokenManager = {
  getValidAccessToken: jest.fn().mockResolvedValue('tok'),
} as unknown as TokenRefreshManager;

const mockObjectManager = {
  upsertBatch: jest.fn().mockResolvedValue(0),
} as unknown as WorkspaceObjectManager;

const mockRabbitMQ = {
  publish: jest.fn().mockImplementation(() => Promise.resolve()),
} as unknown as RabbitMQService;

describe('WorkspaceSyncManager', () => {
  let manager: WorkspaceSyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    (mockTokenManager.getValidAccessToken as jest.Mock).mockResolvedValue('tok');
    manager = new WorkspaceSyncManager(
      mockRepo,
      mockAdapterFactory,
      mockTokenManager,
      mockObjectManager,
      mockRabbitMQ,
    );
  });

  describe('syncConnector', () => {
    it('should return successful sync result', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 10,
        objectsSynced: 10,
        objectsFailed: 0,
        objects: [],
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
        objects: [],
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
        objects: [],
      });
      await manager.syncConnector(mockConnector, true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        'c1',
        expect.objectContaining({ deltaToken: 'dt-next' }),
      );
    });

    it('should call getValidAccessToken for the connector before syncing', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 0,
        objectsSynced: 0,
        objectsFailed: 0,
        objects: [],
      });
      await manager.syncConnector(mockConnector, false);
      expect(mockTokenManager.getValidAccessToken).toHaveBeenCalledWith(mockConnector);
    });

    it('should call objectManager.upsertBatch when objects are returned', async () => {
      const objects = [
        {
          externalId: 'ext1',
          type: 'REPOSITORY',
          title: 'my-repo',
        },
      ];
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 1,
        objectsSynced: 1,
        objectsFailed: 0,
        objects,
      });
      (mockObjectManager.upsertBatch as jest.Mock).mockResolvedValue(1);
      await manager.syncConnector(mockConnector, false);
      expect(mockObjectManager.upsertBatch).toHaveBeenCalledWith('c1', 'u1', 'GITHUB', objects);
    });

    it('should publish WORKSPACE_OBJECT_SYNCED event on success', async () => {
      (mockAdapter.syncObjects as jest.Mock).mockResolvedValue({
        objectsFound: 2,
        objectsSynced: 2,
        objectsFailed: 0,
        objects: [],
      });
      await manager.syncConnector(mockConnector, false);
      expect(mockRabbitMQ.publish).toHaveBeenCalledWith(
        'workspace_object.synced',
        expect.objectContaining({ connectorId: 'c1' }),
      );
    });
  });
});
