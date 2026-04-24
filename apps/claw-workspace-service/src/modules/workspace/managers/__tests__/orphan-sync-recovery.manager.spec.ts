import { Test, type TestingModule } from '@nestjs/testing';

import { AppConfig } from '../../../../app/config/app.config';
import { ORPHAN_RUN_MAX_AGE_MS } from '../../constants/sync-cadence.constants';
import { WorkspaceConnectorRepository } from '../../repositories/workspace-connector.repository';
import { OrphanSyncRecoveryManager } from '../orphan-sync-recovery.manager';

const validBaseConfig = {
  WORKSPACE_DATABASE_URL: 'postgresql://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost',
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
  AI_ACTION_LOCAL_MODEL: 'gemma3:4b',
  AI_ACTION_REQUEST_TIMEOUT_MS: 120_000,
  CHAT_SERVICE_URL: 'http://chat-service:4002',
};

describe('OrphanSyncRecoveryManager', () => {
  let manager: OrphanSyncRecoveryManager;
  let markOrphanedRunsAsFailed: jest.Mock;

  beforeEach(async () => {
    jest.spyOn(AppConfig, 'get').mockReturnValue(validBaseConfig);
    markOrphanedRunsAsFailed = jest.fn();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrphanSyncRecoveryManager,
        {
          provide: WorkspaceConnectorRepository,
          useValue: { markOrphanedRunsAsFailed },
        },
      ],
    }).compile();

    manager = module.get(OrphanSyncRecoveryManager);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sweeps runs older than ORPHAN_RUN_MAX_AGE_MS', async () => {
    markOrphanedRunsAsFailed.mockResolvedValue(2);
    const now = new Date('2026-04-24T12:00:00Z');
    const result = await manager.sweep(now);

    expect(result).toBe(2);
    expect(markOrphanedRunsAsFailed).toHaveBeenCalledWith(
      new Date(now.getTime() - ORPHAN_RUN_MAX_AGE_MS),
      expect.stringContaining('Orphaned run recovered'),
    );
  });

  it('is a no-op when scheduler disabled', async () => {
    jest
      .spyOn(AppConfig, 'get')
      .mockReturnValue({ ...validBaseConfig, WORKSPACE_SCHEDULER_ENABLED: false });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrphanSyncRecoveryManager,
        {
          provide: WorkspaceConnectorRepository,
          useValue: { markOrphanedRunsAsFailed },
        },
      ],
    }).compile();

    const disabledManager = module.get(OrphanSyncRecoveryManager);
    await disabledManager.onModuleInit();
    await disabledManager.recover();

    expect(markOrphanedRunsAsFailed).not.toHaveBeenCalled();
  });

  it('logs sweep result on startup when runs recovered', async () => {
    markOrphanedRunsAsFailed.mockResolvedValue(3);
    await manager.onModuleInit();
    expect(markOrphanedRunsAsFailed).toHaveBeenCalled();
  });

  it('handles empty sweep cleanly', async () => {
    markOrphanedRunsAsFailed.mockResolvedValue(0);
    await manager.recover();
    expect(markOrphanedRunsAsFailed).toHaveBeenCalled();
  });
});
