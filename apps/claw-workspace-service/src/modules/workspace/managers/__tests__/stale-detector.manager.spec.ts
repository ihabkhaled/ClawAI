import { AppConfig } from '../../../../app/config/app.config';
import { WorkspaceProvider } from '../../../../common/enums/workspace-provider.enum';
import { StaleDetectorManager } from '../stale-detector.manager';
import type { WorkspaceSyncSchedulerManager } from '../workspace-sync-scheduler.manager';
import type { RabbitMQService } from '@claw/shared-rabbitmq';
import type { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';

jest.spyOn(AppConfig, 'get').mockReturnValue({
  WORKSPACE_DATABASE_URL: 'x',
  REDIS_URL: 'x',
  RABBITMQ_URL: 'x',
  JWT_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: 'a'.repeat(64),
  WORKSPACE_PORT: 4014,
  WORKSPACE_SCHEDULER_ENABLED: true,
  WORKSPACE_SCHEDULER_TICK_CRON: '*',
  WORKSPACE_SYNC_STALE_DETECTOR_CRON: '*',
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
  AI_ACTION_LOCAL_MODEL: 'gemma3:4b',
  AI_ACTION_REQUEST_TIMEOUT_MS: 120_000,
});

describe('StaleDetectorManager', () => {
  let manager: StaleDetectorManager;
  const connectorRepo = {
    findStaleCandidates: jest.fn(),
    markDegraded: jest.fn().mockResolvedValue({}),
  } as unknown as WorkspaceConnectorRepository;
  const scheduler = {
    getCadenceForProvider: jest.fn().mockImplementation((p: WorkspaceProvider) => {
      if (p === WorkspaceProvider.GMAIL) return 120;
      if (p === WorkspaceProvider.JIRA) return 300;
      return 600;
    }),
  } as unknown as WorkspaceSyncSchedulerManager;
  const rabbitmq = {
    publish: jest.fn().mockImplementation(() => Promise.resolve()),
  } as unknown as RabbitMQService;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new StaleDetectorManager(connectorRepo, scheduler, rabbitmq);
  });

  it('flips connectors past 3× cadence to DEGRADED', async () => {
    const now = new Date('2026-04-24T12:00:00Z');
    const staleLast = new Date(now.getTime() - 8 * 60 * 1000);
    (connectorRepo.findStaleCandidates as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        userId: 'u1',
        provider: 'GMAIL',
        status: 'CONNECTED',
        lastSyncAt: staleLast,
        syncIntervalSeconds: null,
      },
    ]);
    const flipped = await manager.flipStaleConnectors(now);
    expect(flipped).toBe(1);
    expect(connectorRepo.markDegraded).toHaveBeenCalledTimes(1);
    expect(rabbitmq.publish).toHaveBeenCalledTimes(1);
  });

  it('skips connectors within 3× cadence', async () => {
    const now = new Date('2026-04-24T12:00:00Z');
    const fresh = new Date(now.getTime() - 90 * 1000);
    (connectorRepo.findStaleCandidates as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        userId: 'u1',
        provider: 'GMAIL',
        status: 'CONNECTED',
        lastSyncAt: fresh,
        syncIntervalSeconds: null,
      },
    ]);
    const flipped = await manager.flipStaleConnectors(now);
    expect(flipped).toBe(0);
    expect(rabbitmq.publish).not.toHaveBeenCalled();
  });

  it('skips connectors already DEGRADED (idempotency)', async () => {
    const now = new Date('2026-04-24T12:00:00Z');
    const staleLast = new Date(now.getTime() - 60 * 60 * 1000);
    (connectorRepo.findStaleCandidates as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        userId: 'u1',
        provider: 'GMAIL',
        status: 'DEGRADED',
        lastSyncAt: staleLast,
        syncIntervalSeconds: null,
      },
    ]);
    const flipped = await manager.flipStaleConnectors(now);
    expect(flipped).toBe(0);
  });

  it('uses per-connector cadence override when set', async () => {
    const now = new Date('2026-04-24T12:00:00Z');
    const lastSync = new Date(now.getTime() - 35 * 60 * 1000);
    (connectorRepo.findStaleCandidates as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        userId: 'u1',
        provider: 'GMAIL',
        status: 'CONNECTED',
        lastSyncAt: lastSync,
        syncIntervalSeconds: 600,
      },
    ]);
    const flipped = await manager.flipStaleConnectors(now);
    expect(flipped).toBe(1);
  });

  it('treats null lastSyncAt as infinitely stale', async () => {
    const now = new Date();
    (connectorRepo.findStaleCandidates as jest.Mock).mockResolvedValueOnce([
      {
        id: 'c1',
        userId: 'u1',
        provider: 'GMAIL',
        status: 'CONNECTED',
        lastSyncAt: null,
        syncIntervalSeconds: null,
      },
    ]);
    const flipped = await manager.flipStaleConnectors(now);
    expect(flipped).toBe(1);
  });
});
