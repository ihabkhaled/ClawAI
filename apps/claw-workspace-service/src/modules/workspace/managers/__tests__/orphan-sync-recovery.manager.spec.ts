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
  AUTH_SERVICE_URL: 'http://auth-service:4001',
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
  ADMIN_IP_ALLOWLIST: '',
  CLAW_HOSTNAME: 'claw.local',
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
