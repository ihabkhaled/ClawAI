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
  GITHUB_CLIENT_ID: 'gh-id',
  GITHUB_CLIENT_SECRET: 'gh-secret',
  SLACK_CLIENT_ID: 'sl-id',
  SLACK_CLIENT_SECRET: 'sl-secret',
  JIRA_CLIENT_ID: 'jira-id',
  JIRA_CLIENT_SECRET: 'jira-secret',
  GOOGLE_CLIENT_ID: 'goog-id',
  GOOGLE_CLIENT_SECRET: 'goog-secret',
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
    it('should store state in Redis and return authorizationUrl with state', async () => {
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
      expect(result.authorizationUrl).toContain('state=');
      expect(result.state).toBeDefined();
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
