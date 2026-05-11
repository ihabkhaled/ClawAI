import { AppConfig } from '../../../../app/config/app.config';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { WorkspaceSyncSchedulerManager } from '../workspace-sync-scheduler.manager';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { SyncCadenceRepository } from '../../repositories/sync-cadence.repository';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';

const BASE_CFG = {
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
  WORKSPACE_SYNC_RETRY_BASE_MS: 1000,
  WORKSPACE_SYNC_RETRY_JITTER_MS: 500,
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
};

jest.spyOn(AppConfig, 'get').mockReturnValue(BASE_CFG);

describe('WorkspaceSyncSchedulerManager', () => {
  const prisma = {} as PrismaService;
  const connectorRepo = {
    findScheduleCandidates: jest.fn(),
    markTick: jest.fn(),
  } as unknown as WorkspaceConnectorRepository;
  const cadenceRepo = {
    findAll: jest.fn().mockResolvedValue([]),
  } as unknown as SyncCadenceRepository;
  const rabbitmq = { publish: jest.fn() } as unknown as RabbitMQService;

  let manager: WorkspaceSyncSchedulerManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new WorkspaceSyncSchedulerManager(prisma, connectorRepo, cadenceRepo, rabbitmq);
  });

  describe('computeEligibility', () => {
    it('returns isEligible=true when no prior sync', () => {
      const result = manager.computeEligibility(
        {
          id: 'c1',
          userId: 'u1',
          provider: WorkspaceProvider.GMAIL,
          syncIntervalSeconds: null,
          lastSyncAt: null,
          lastTickAt: null,
        },
        new Date(),
      );
      expect(result.isEligible).toBe(true);
    });

    it('respects per-connector cadence override', () => {
      const now = new Date('2026-04-24T12:00:00Z');
      const lastSyncAt = new Date('2026-04-24T11:55:00Z');
      const result = manager.computeEligibility(
        {
          id: 'c1',
          userId: 'u1',
          provider: WorkspaceProvider.GMAIL,
          syncIntervalSeconds: 60,
          lastSyncAt,
          lastTickAt: null,
        },
        now,
      );
      expect(result.cadenceSeconds).toBe(60);
      expect(result.isEligible).toBe(true);
    });

    it('returns isEligible=false when within cadence', () => {
      const now = new Date('2026-04-24T12:00:00Z');
      const lastSyncAt = new Date('2026-04-24T11:59:50Z');
      const result = manager.computeEligibility(
        {
          id: 'c1',
          userId: 'u1',
          provider: WorkspaceProvider.GMAIL,
          syncIntervalSeconds: 60,
          lastSyncAt,
          lastTickAt: null,
        },
        now,
      );
      expect(result.isEligible).toBe(false);
    });

    it('uses fallback cadence from constants when no override and no cache', () => {
      const now = new Date();
      const result = manager.computeEligibility(
        {
          id: 'c1',
          userId: 'u1',
          provider: WorkspaceProvider.GMAIL,
          syncIntervalSeconds: null,
          lastSyncAt: null,
          lastTickAt: null,
        },
        now,
      );
      // Gmail default = 120s (from constants fallback)
      expect(result.cadenceSeconds).toBe(120);
    });

    it('uses lastTickAt as anchor when lastSyncAt is null', () => {
      const now = new Date('2026-04-24T12:00:00Z');
      const lastTickAt = new Date('2026-04-24T11:58:00Z');
      const result = manager.computeEligibility(
        {
          id: 'c1',
          userId: 'u1',
          provider: WorkspaceProvider.GMAIL,
          syncIntervalSeconds: 60,
          lastSyncAt: null,
          lastTickAt,
        },
        now,
      );
      expect(result.isEligible).toBe(true);
    });
  });

  describe('getCadenceForProvider', () => {
    it('returns cached cadence when present', async () => {
      (cadenceRepo.findAll as jest.Mock).mockResolvedValueOnce([
        {
          provider: WorkspaceProvider.SLACK,
          intervalSeconds: 30,
          backfillWindowDays: 7,
          priority: 10,
          supportsDeltaSync: false,
          supportsWebhookSync: true,
          nativeCursorKind: null,
        },
      ]);
      await manager.reloadCadenceCache();
      expect(manager.getCadenceForProvider(WorkspaceProvider.SLACK)).toBe(30);
    });

    it('falls back to FALLBACK_CADENCE_SECONDS map when not cached', () => {
      expect(manager.getCadenceForProvider(WorkspaceProvider.JIRA)).toBe(300);
    });
  });
});
