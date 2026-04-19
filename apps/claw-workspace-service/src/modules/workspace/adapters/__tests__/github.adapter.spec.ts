import { GitHubAdapter } from '../github.adapter';
import { WorkspaceConnectorStatus } from '../../../../common/enums/workspace-connector-status.enum';
import { AppConfig } from '../../../../app/config/app.config';

jest.spyOn(AppConfig, 'get').mockReturnValue({
  WORKSPACE_DATABASE_URL: 'postgres://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: 'a'.repeat(64),
  WORKSPACE_PORT: 4014,
  GITHUB_CLIENT_ID: 'gh-id',
  GITHUB_CLIENT_SECRET: 'gh-secret',
  SLACK_CLIENT_ID: 'sl-id',
  SLACK_CLIENT_SECRET: 'sl-secret',
  JIRA_CLIENT_ID: 'jira-id',
  JIRA_CLIENT_SECRET: 'jira-secret',
  GOOGLE_CLIENT_ID: 'goog-id',
  GOOGLE_CLIENT_SECRET: 'goog-secret',
});

global.fetch = jest.fn();

describe('GitHubAdapter', () => {
  let adapter: GitHubAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new GitHubAdapter();
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
});
