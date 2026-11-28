import { type Mock, vi } from 'vitest';

import { SessionTerminationReason } from '../../../sessions/enums/session-termination-reason.enum';
import { type UsersRepository } from '../../../users/repositories/users.repository';
import { type AuthRepository } from '../../repositories/auth.repository';
import { type PasswordResetRepository } from '../../repositories/password-reset.repository';
import { type SessionRevocationCacheService } from '../../services/session-revocation-cache.service';
import { PasswordResetManager } from '../password-reset.manager';

vi.mock('@common/utilities', () => ({
  hashPassword: vi.fn((plain: string) => Promise.resolve(`hash:${plain}`)),
}));

vi.mock('@claw/shared-utilities', () => ({
  hashBearerToken: vi.fn(
    (token: string, pepper: string) => `digest(${pepper.split(':')[0]}|${token})`,
  ),
}));

vi.mock('../../../../app/config/app.config', () => ({
  AppConfig: { get: () => ({ JWT_SECRET: 'x'.repeat(40) }) },
}));

const STRONG = 'BrandNewPass9!';
const TOKEN_ROW = { id: 'token-1', userId: 'user-1' };

describe('PasswordResetManager.confirm', () => {
  let findActiveByTokenHash: Mock;
  let consume: Mock;
  let updateById: Mock;
  let revokeSessionsReturningIds: Mock;
  let revoke: Mock;
  let order: string[];
  let manager: PasswordResetManager;

  beforeEach(() => {
    order = [];
    findActiveByTokenHash = vi.fn().mockResolvedValue(TOKEN_ROW);
    consume = vi.fn(async () => {
      order.push('consume');
      return Promise.resolve(true);
    });
    updateById = vi.fn(async () => {
      order.push('updateById');
      return Promise.resolve({});
    });
    revokeSessionsReturningIds = vi.fn(async () => {
      order.push('revokeSessions');
      return Promise.resolve(['s1', 's2']);
    });
    revoke = vi.fn(async () => {
      order.push('publish');
      return Promise.resolve();
    });
    manager = new PasswordResetManager(
      { findActiveByTokenHash, consume } as unknown as PasswordResetRepository,
      {} as unknown as AuthRepository,
      { updateById, revokeSessionsReturningIds } as unknown as UsersRepository,
      { revoke } as unknown as SessionRevocationCacheService,
    );
  });

  it('claims the single-use token BEFORE it writes the password', async () => {
    await expect(manager.confirm('raw-token', STRONG)).resolves.toBe(true);
    expect(order.slice(0, 2)).toEqual(['consume', 'updateById']);
  });

  it('a second request carrying the same token changes nothing', async () => {
    consume.mockResolvedValue(false);
    await expect(manager.confirm('raw-token', STRONG)).resolves.toBe(false);
    expect(updateById).not.toHaveBeenCalled();
    expect(revokeSessionsReturningIds).not.toHaveBeenCalled();
  });

  it('closes every login with a reason AND publishes the ids, so the intruder access token dies now (ADR-112)', async () => {
    await manager.confirm('raw-token', STRONG);
    expect(revokeSessionsReturningIds).toHaveBeenCalledWith(
      'user-1',
      SessionTerminationReason.PASSWORD_CHANGED,
    );
    expect(revoke).toHaveBeenCalledWith(['s1', 's2']);
    expect(order).toEqual(['consume', 'updateById', 'revokeSessions', 'publish']);
  });

  it('stores only the hash of the new password and clears mustChangePassword', async () => {
    await manager.confirm('raw-token', STRONG);
    expect(updateById).toHaveBeenCalledWith('user-1', {
      passwordHash: `hash:${STRONG}`,
      mustChangePassword: false,
    });
  });

  it('refuses a weak password before it touches the token', async () => {
    await expect(manager.confirm('raw-token', 'weak')).resolves.toBe(false);
    expect(findActiveByTokenHash).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it('refuses an unknown, expired or used token without a write', async () => {
    findActiveByTokenHash.mockResolvedValue(null);
    await expect(manager.confirm('raw-token', STRONG)).resolves.toBe(false);
    expect(consume).not.toHaveBeenCalled();
    expect(updateById).not.toHaveBeenCalled();
  });
});
