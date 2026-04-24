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
