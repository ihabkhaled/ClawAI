import { GitHubAdapter } from '../github.adapter';
import { GitHubWriteActionsHelper } from '../github-write-actions.helper';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { AppConfig } from '../../../../app/config/app.config';

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
});

global.fetch = jest.fn();

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GitHubAdapter(new GitHubWriteActionsHelper());
  });

  describe('healthCheck', () => {
    it('should return CONNECTED on 200 response', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: true, status: 200 });
      const result = await adapter.healthCheck('token-abc');
      expect(result.status).toBe(WorkspaceConnectorStatus.CONNECTED);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should return DISCONNECTED on 401', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401 });
      const result = await adapter.healthCheck('bad-token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('Unauthorized — invalid token');
    });

    it('should return DEGRADED on non-401 HTTP error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DEGRADED);
    });

    it('should return DISCONNECTED on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('ECONNREFUSED');
    });

    it('should return DISCONNECTED on non-Error throw', async () => {
      (global.fetch as jest.Mock).mockRejectedValue('boom');
      const result = await adapter.healthCheck('token');
      expect(result.status).toBe(WorkspaceConnectorStatus.DISCONNECTED);
      expect(result.errorMessage).toBe('Unknown error');
    });
  });

  describe('getCapabilities', () => {
    it('should support OAuth and PAT', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsOAuth).toBe(true);
      expect(caps.supportsPat).toBe(true);
    });

    it('should support delta sync and webhooks', () => {
      const caps = adapter.getCapabilities();
      expect(caps.supportsDeltaSync).toBe(true);
      expect(caps.supportsWebhooks).toBe(true);
    });

    it('should include REPOSITORY in object types', () => {
      expect(adapter.getCapabilities().objectTypes).toContain('REPOSITORY');
    });
  });

  describe('getDefaultScopes', () => {
    it('should return an array of scopes', () => {
      const scopes = adapter.getDefaultScopes();
      expect(Array.isArray(scopes)).toBe(true);
      expect(scopes.length).toBeGreaterThan(0);
    });
  });

  describe('refreshTokens', () => {
    it('should throw since GitHub PAT does not support refresh', async () => {
      await expect(
        adapter.refreshTokens('ref', { clientId: 'x', clientSecret: 'y' }),
      ).rejects.toThrow();
    });
  });

  describe('syncObjects', () => {
    it('returns repos plus issues and PRs from the first N repos', async () => {
      const repo1 = {
        id: 1,
        full_name: 'me/repo1',
        description: 'first',
        html_url: 'https://github.com/me/repo1',
        owner: { login: 'me' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };
      const repo2 = {
        ...repo1,
        id: 2,
        full_name: 'me/repo2',
        description: null,
      };
      const issue = {
        id: 100,
        number: 5,
        title: 'bug',
        body: 'details',
        html_url: 'https://github.com/me/repo1/issues/5',
        state: 'open',
        user: { login: 'me' },
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-02T00:00:00Z',
      };
      const pr = {
        id: 200,
        number: 7,
        title: 'feat',
        body: null,
        html_url: 'https://github.com/me/repo1/pull/7',
        state: 'closed',
        user: { login: 'me' },
        created_at: '2024-03-01T00:00:00Z',
        updated_at: '2024-03-02T00:00:00Z',
        merged_at: '2024-03-02T00:00:00Z',
      };

      (global.fetch as jest.Mock)
        // user/repos
        .mockResolvedValueOnce({ ok: true, json: async () => [repo1, repo2] })
        // repo1 issues
        .mockResolvedValueOnce({ ok: true, json: async () => [issue] })
        // repo1 pulls
        .mockResolvedValueOnce({ ok: true, json: async () => [pr] })
        // repo2 issues
        .mockResolvedValueOnce({ ok: true, json: async () => [] })
        // repo2 pulls
        .mockResolvedValueOnce({ ok: true, json: async () => [] });

      const result = await adapter.syncObjects('token');
      expect(result.objectsFound).toBe(4);
      expect(result.objects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'REPOSITORY', externalId: '1' }),
          expect.objectContaining({ type: 'REPOSITORY', externalId: '2' }),
          expect.objectContaining({
            type: 'ISSUE',
            externalId: '100',
            metadata: expect.objectContaining({ fullName: 'me/repo1', number: 5 }),
          }),
          expect.objectContaining({
            type: 'PULL_REQUEST',
            externalId: '200',
            metadata: expect.objectContaining({ merged: true }),
          }),
        ]),
      );
    });

    it('tolerates per-repo failures', async () => {
      const repo = {
        id: 1,
        full_name: 'me/repo1',
        description: null,
        html_url: 'https://github.com/me/repo1',
        owner: { login: 'me' },
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-02-01T00:00:00Z',
      };
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => [repo] })
        .mockResolvedValueOnce({ ok: false, status: 503 })
        .mockRejectedValueOnce(new Error('net'));

      const result = await adapter.syncObjects('token');
      // Only the repo survives
      expect(result.objects).toHaveLength(1);
      expect(result.objects[0]?.type).toBe('REPOSITORY');
    });
  });

  describe('fetchObjectDetails', () => {
    it('REPOSITORY — resolves by externalId', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 42,
          full_name: 'me/repo',
          description: 'x',
          html_url: 'https://github.com/me/repo',
          owner: { login: 'me' },
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
          stargazers_count: 1,
          forks_count: 2,
          open_issues_count: 3,
          default_branch: 'main',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', '42', 'REPOSITORY');
      expect(live?.title).toBe('me/repo');
      expect(live?.metadata).toEqual(
        expect.objectContaining({ stargazers: 1, forks: 2, defaultBranch: 'main' }),
      );
    });

    it('REPOSITORY — returns null on 404', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
      const live = await adapter.fetchObjectDetails('token', '42', 'REPOSITORY');
      expect(live).toBeNull();
    });

    it('ISSUE — uses fullName/number from metadata', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 99,
          number: 5,
          title: 'bug',
          body: 'details',
          html_url: 'https://github.com/me/repo/issues/5',
          state: 'open',
          user: { login: 'me' },
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-02T00:00:00Z',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', '99', 'ISSUE', {
        fullName: 'me/repo',
        number: 5,
      });
      expect(live?.title).toBe('bug');
      expect(live?.metadata).toEqual(
        expect.objectContaining({ fullName: 'me/repo', number: 5, state: 'open' }),
      );
    });

    it('PULL_REQUEST — flags merged when merged_at is set', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 200,
          number: 7,
          title: 'feat',
          body: null,
          html_url: 'https://github.com/me/repo/pull/7',
          state: 'closed',
          user: { login: 'me' },
          created_at: '2024-03-01T00:00:00Z',
          updated_at: '2024-03-02T00:00:00Z',
          merged_at: '2024-03-02T00:00:00Z',
        }),
      });
      const live = await adapter.fetchObjectDetails('token', '200', 'PULL_REQUEST', {
        fullName: 'me/repo',
        number: 7,
      });
      expect(live?.metadata).toEqual(expect.objectContaining({ merged: true }));
    });

    it('ISSUE — returns null when metadata is missing', async () => {
      const live = await adapter.fetchObjectDetails('token', '99', 'ISSUE', {});
      expect(live).toBeNull();
    });
  });
});
