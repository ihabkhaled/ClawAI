import { type Mock, vi } from 'vitest';
import type * as ConstantTimeEqualModule from '../../../../common/utilities/constant-time-equal.utility';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';
import type { SessionAdminRepository } from '../../repositories/session-admin.repository';
import { SessionGlobalGuardService } from '../session-global-guard.service';

const verifyPassword = vi.fn<(hash: string, password: string) => Promise<boolean>>();
const burnPasswordVerification = vi.fn<(password: string) => Promise<boolean>>();

vi.mock('@common/utilities', async () => {
  const actual = await vi.importActual<typeof ConstantTimeEqualModule>(
    '../../../../common/utilities/constant-time-equal.utility',
  );
  return {
    constantTimeEqual: actual.constantTimeEqual,
    verifyPassword: (hash: string, password: string) => verifyPassword(hash, password),
    burnPasswordVerification: (password: string) => burnPasswordVerification(password),
  };
});

/** A tiny in-memory Redis: enough for SET EX, GET, DEL, GETDEL and the fixed-window counter. */
function fakeRedis(): {
  service: RedisService;
  store: Map<string, string>;
  ttls: Map<string, number>;
} {
  const store = new Map<string, string>();
  const ttls = new Map<string, number>();
  const service = {
    get: vi.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: vi.fn((key: string, value: string, ttl?: number) => {
      store.set(key, value);
      if (ttl !== undefined) ttls.set(key, ttl);
      return Promise.resolve();
    }),
    del: vi.fn((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    incrementWindow: vi.fn((key: string) => {
      const next = Number.parseInt(store.get(key) ?? '0', 10) + 1;
      store.set(key, String(next));
      return Promise.resolve({ count: next, ttlSeconds: 900 });
    }),
    getClient: () => ({
      getdel: (key: string) => {
        const value = store.get(key) ?? null;
        store.delete(key);
        return Promise.resolve(value);
      },
    }),
  };
  return { service: service as unknown as RedisService, store, ttls };
}

describe('SessionGlobalGuardService', () => {
  let redis: ReturnType<typeof fakeRedis>;
  let repository: { findPasswordHash: Mock; writeAudit: Mock };
  let guard: SessionGlobalGuardService;

  beforeEach(() => {
    verifyPassword.mockReset();
    burnPasswordVerification.mockReset().mockResolvedValue(false);
    redis = fakeRedis();
    repository = {
      findPasswordHash: vi.fn().mockResolvedValue('hash'),
      writeAudit: vi.fn().mockResolvedValue(undefined),
    };
    guard = new SessionGlobalGuardService(
      redis.service,
      repository as unknown as SessionAdminRepository,
    );
  });

  describe('issueChallenge', () => {
    it('verifies the password and returns a one-time token valid for 60 seconds', async () => {
      verifyPassword.mockResolvedValue(true);

      const result = await guard.issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'secret');

      expect(verifyPassword).toHaveBeenCalledWith('hash', 'secret');
      expect(result.expiresInSeconds).toBe(60);
      expect(result.token.length).toBeGreaterThanOrEqual(40);
      const keys = [...redis.store.keys()];
      expect(keys).toHaveLength(1);
      // Only the hash of the token is stored, never the token itself.
      expect(keys[0]).not.toContain(result.token);
      expect(redis.ttls.get(keys[0] ?? '')).toBe(60);
    });

    it('refuses a wrong password with a coded 403, counts it, logs and audits it', async () => {
      verifyPassword.mockResolvedValue(false);

      await expect(
        guard.issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'wrong'),
      ).rejects.toMatchObject({ code: 'GLOBAL_PASSWORD_INVALID', status: 403 });
      expect(redis.store.get('auth:session-global-pw-fail:admin-1')).toBe('1');
      expect(repository.writeAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'admin-1',
          action: 'SESSION_GLOBAL_PASSWORD_FAILED',
        }),
      );
      // No token was issued.
      expect(
        [...redis.store.keys()].some((key) => key.startsWith('auth:session-global-token:')),
      ).toBe(false);
    });

    it('never stores the password anywhere (store, audit)', async () => {
      verifyPassword.mockResolvedValue(false);
      await guard
        .issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'Sup3r-Secret!')
        .catch(() => null);

      expect(JSON.stringify([...redis.store.entries()])).not.toContain('Sup3r-Secret!');
      expect(JSON.stringify(repository.writeAudit.mock.calls)).not.toContain('Sup3r-Secret!');
    });

    it('locks the step after 5 wrong passwords, even for the right one', async () => {
      verifyPassword.mockResolvedValue(false);
      for (let attempt = 0; attempt < 5; attempt += 1) {
        await guard.issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'wrong').catch(() => null);
      }
      verifyPassword.mockResolvedValue(true);

      await expect(
        guard.issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'right'),
      ).rejects.toMatchObject({ code: 'GLOBAL_PASSWORD_LOCKED', status: 429 });
      expect(verifyPassword).toHaveBeenCalledTimes(5);
    });

    it('a correct password clears the failure counter', async () => {
      verifyPassword.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
      await guard.issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'wrong').catch(() => null);

      await guard.issueChallenge('admin-1', 'TERMINATE_ALL' as never, 'right');

      expect(redis.store.has('auth:session-global-pw-fail:admin-1')).toBe(false);
    });

    it('spends the same argon2 work for a missing account (no timing difference)', async () => {
      repository.findPasswordHash.mockResolvedValue(null);

      await expect(
        guard.issueChallenge('ghost', 'TERMINATE_ALL' as never, 'x'),
      ).rejects.toMatchObject({ code: 'GLOBAL_PASSWORD_INVALID' });
      expect(burnPasswordVerification).toHaveBeenCalled();
      expect(verifyPassword).not.toHaveBeenCalled();
    });
  });

  describe('consume', () => {
    async function mint(adminId = 'admin-1', action = 'TERMINATE_ALL'): Promise<string> {
      verifyPassword.mockResolvedValue(true);
      return (await guard.issueChallenge(adminId, action as never, 'pw')).token;
    }

    it('accepts a fresh token for the same admin and action, exactly once', async () => {
      const token = await mint();

      await expect(
        guard.consume('admin-1', 'TERMINATE_ALL' as never, token),
      ).resolves.toBeUndefined();
      await expect(guard.consume('admin-1', 'TERMINATE_ALL' as never, token)).rejects.toMatchObject(
        {
          code: 'GLOBAL_TOKEN_INVALID',
        },
      );
    });

    it('refuses a token issued to another administrator', async () => {
      const token = await mint('admin-1');

      await expect(guard.consume('admin-2', 'TERMINATE_ALL' as never, token)).rejects.toMatchObject(
        {
          code: 'GLOBAL_TOKEN_INVALID',
        },
      );
    });

    it('refuses a token minted for a different action', async () => {
      const token = await mint('admin-1', 'CLEAR_ALL_LOGS');

      await expect(guard.consume('admin-1', 'TERMINATE_ALL' as never, token)).rejects.toMatchObject(
        {
          code: 'GLOBAL_TOKEN_INVALID',
        },
      );
    });

    it('refuses an expired or invented token', async () => {
      await expect(
        guard.consume('admin-1', 'TERMINATE_ALL' as never, 'never-issued-token-value'),
      ).rejects.toMatchObject({ code: 'GLOBAL_TOKEN_INVALID', status: 403 });
    });

    it('refuses a corrupt stored value', async () => {
      const token = await mint();
      const [key] = [...redis.store.keys()];
      redis.store.set(key ?? '', '{not json');

      await expect(guard.consume('admin-1', 'TERMINATE_ALL' as never, token)).rejects.toMatchObject(
        {
          code: 'GLOBAL_TOKEN_INVALID',
        },
      );
    });
  });

  describe('assertPhrase', () => {
    it('accepts the exact phrase', () => {
      expect(() => guard.assertPhrase('TERMINATE ALL', 'TERMINATE ALL')).not.toThrow();
    });

    it.each(['terminate all', 'TERMINATE ALL ', 'TERMINATE', ''])('refuses %j', (wrong) => {
      expect(() => guard.assertPhrase(wrong, 'TERMINATE ALL')).toThrowError(
        expect.objectContaining({ code: 'GLOBAL_PHRASE_INVALID' }) as Error,
      );
    });
  });
});
