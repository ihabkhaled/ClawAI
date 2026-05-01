import { OAuthTokenManager } from '../oauth-token.manager';
import { AppConfig } from '../../../../app/config/app.config';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';

const TEST_KEY = 'a'.repeat(64);

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  setNxEx: jest.fn(),
  del: jest.fn(),
} as unknown as RedisService;

jest.spyOn(AppConfig, 'get').mockReturnValue({
  WORKSPACE_DATABASE_URL: 'postgres://localhost/test',
  REDIS_URL: 'redis://localhost:6379',
  RABBITMQ_URL: 'amqp://localhost:5672',
  JWT_SECRET: 'x'.repeat(32),
  ENCRYPTION_KEY: TEST_KEY,
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
});

describe('OAuthTokenManager', () => {
  let manager: OAuthTokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new OAuthTokenManager(mockRedis);
  });

  describe('encryptTokenSet / decryptTokenSet', () => {
    it('should encrypt and decrypt token sets round-trip', () => {
      const tokens = { accessToken: 'tok_abc', refreshToken: 'ref_xyz', scopes: ['read', 'write'] };
      const encrypted = manager.encryptTokenSet(tokens);
      const decrypted = manager.decryptTokenSet(encrypted);
      expect(decrypted).toEqual(tokens);
    });

    it('should produce unique ciphertexts for same input', () => {
      const tokens = { accessToken: 'tok', scopes: [] };
      const e1 = manager.encryptTokenSet(tokens);
      const e2 = manager.encryptTokenSet(tokens);
      expect(e1).not.toBe(e2);
    });
  });

  describe('isTokenExpired', () => {
    it('should return false when expiresAt is undefined', () => {
      expect(manager.isTokenExpired()).toBe(false);
    });

    it('should return true for a date in the past', () => {
      const past = new Date(Date.now() - 60_000);
      expect(manager.isTokenExpired(past)).toBe(true);
    });

    it('should return true within the buffer window', () => {
      const almostExpired = new Date(Date.now() + 100);
      expect(manager.isTokenExpired(almostExpired)).toBe(true);
    });

    it('should return false for a future date beyond the buffer', () => {
      const future = new Date(Date.now() + 10 * 60 * 1000);
      expect(manager.isTokenExpired(future)).toBe(false);
    });
  });

  describe('initOAuthFlow', () => {
    it('should store state in Redis and return authorizationUrl with PKCE challenge by default', async () => {
      (mockRedis.set as jest.Mock).mockImplementation(() => Promise.resolve());
      const result = await manager.initOAuthFlow(
        'user1',
        'GITHUB',
        'app-config-1',
        'https://app.test/cb',
        'https://github.com/login/oauth/authorize',
        'gh-id',
        ['repo'],
      );
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('oauth:state:'),
        expect.any(String),
        600,
      );
      expect(result.authorizationUrl).toContain('code_challenge');
      expect(result.authorizationUrl).toContain('code_challenge_method=S256');
      expect(result.authorizationUrl).toContain('state=');
      expect(result.state).toBeDefined();
    });

    it('should NOT include code_challenge when pkce=false (e.g. Bitbucket)', async () => {
      (mockRedis.set as jest.Mock).mockImplementation(() => Promise.resolve());
      const result = await manager.initOAuthFlow(
        'user1',
        'BITBUCKET',
        'app-config-2',
        'https://app.test/cb',
        'https://bitbucket.org/site/oauth2/authorize',
        'bb-id',
        ['repository'],
        { pkce: false },
      );
      expect(result.authorizationUrl).not.toContain('code_challenge');
      expect(result.authorizationUrl).not.toContain('code_challenge_method');
      expect(result.authorizationUrl).toContain('state=');
    });

    it('should store verifier=undefined in state when pkce=false', async () => {
      (mockRedis.set as jest.Mock).mockImplementation(() => Promise.resolve());
      await manager.initOAuthFlow(
        'user1',
        'BITBUCKET',
        'app-config-2',
        'https://app.test/cb',
        'https://bitbucket.org/site/oauth2/authorize',
        'bb-id',
        ['repository'],
        { pkce: false },
      );
      const storedJson = (mockRedis.set as jest.Mock).mock.calls[0][1] as string;
      const stored = JSON.parse(storedJson);
      expect(stored.verifier).toBeUndefined();
    });
  });

  describe('resolveOAuthState', () => {
    it('should return null when state not found in Redis', async () => {
      (mockRedis.get as jest.Mock).mockResolvedValue(null);
      const result = await manager.resolveOAuthState('invalid-state');
      expect(result).toBeNull();
    });

    it('should return parsed state data and delete key', async () => {
      const stateData = {
        userId: 'u1',
        provider: 'GITHUB',
        redirectUri: 'https://cb',
        verifier: 'abc',
      };
      (mockRedis.get as jest.Mock).mockResolvedValue(JSON.stringify(stateData));
      (mockRedis.del as jest.Mock).mockImplementation(() => Promise.resolve());
      const result = await manager.resolveOAuthState('valid-state');
      expect(result).toEqual(stateData);
      expect(mockRedis.del).toHaveBeenCalledWith('oauth:state:valid-state');
    });
  });

  describe('acquireRefreshLock', () => {
    it('should return true when lock acquired (Redis returns OK)', async () => {
      (mockRedis.setNxEx as jest.Mock).mockResolvedValue(true);
      await expect(manager.acquireRefreshLock('connector-1')).resolves.toBe(true);
    });

    it('should return false when lock already held', async () => {
      (mockRedis.setNxEx as jest.Mock).mockResolvedValue(false);
      await expect(manager.acquireRefreshLock('connector-1')).resolves.toBe(false);
    });
  });
});
