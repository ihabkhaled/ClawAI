import { type Mock } from 'vitest';
import { AccountBannedException } from '../../../../common/errors';
import { type UsersRepository } from '../../../users/repositories/users.repository';
import { AccountBanGateService } from '../account-ban-gate.service';

describe('AccountBanGateService', () => {
  let clearBan: Mock;
  let gate: AccountBanGateService;
  const hourAgo = new Date(Date.now() - 3_600_000);

  beforeEach(() => {
    clearBan = vi.fn().mockResolvedValue(undefined);
    gate = new AccountBanGateService({ clearBan } as unknown as UsersRepository);
  });

  it('lets an unbanned account through and writes nothing', async () => {
    await expect(gate.assertNotBanned({ id: 'u1' })).resolves.toBeUndefined();
    await expect(
      gate.assertNotBanned({ id: 'u1', bannedAt: null, bannedUntil: null }),
    ).resolves.toBeUndefined();
    expect(clearBan).not.toHaveBeenCalled();
  });

  it('refuses a lifetime ban with ACCOUNT_BANNED and banPermanent', async () => {
    const error = await gate
      .assertNotBanned({ id: 'u1', bannedAt: hourAgo, bannedUntil: null })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AccountBannedException);
    expect(error).toMatchObject({ code: 'ACCOUNT_BANNED', status: 403 });
    expect((error as AccountBannedException).getResponse()).toMatchObject({
      details: { banPermanent: true, bannedUntil: null },
    });
  });

  it('refuses a live timed ban and names when it ends', async () => {
    const until = new Date(Date.now() + 600_000);
    const error = await gate
      .assertNotBanned({ id: 'u1', bannedAt: hourAgo, bannedUntil: until })
      .catch((e: unknown) => e);
    expect((error as AccountBannedException).getResponse()).toMatchObject({
      details: { banPermanent: false, bannedUntil: until.toISOString() },
    });
    expect(clearBan).not.toHaveBeenCalled();
  });

  // ADR-233: an automatic suspension is the same ban, flagged so the client says "temporarily
  // suspended" instead of "an administrator banned this account". Nothing about WHY reaches the wire.
  it('marks an automatic suspension on the wire, with the end date and no reason', async () => {
    const until = new Date(Date.now() + 600_000);
    const error = await gate
      .assertNotBanned({
        id: 'u1',
        bannedAt: hourAgo,
        bannedUntil: until,
        banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED',
        bannedByUserId: null,
      })
      .catch((e: unknown) => e);
    const details = (error as AccountBannedException).getResponse() as { details: object };
    expect(details.details).toEqual({
      banPermanent: false,
      bannedUntil: until.toISOString(),
      autoSuspended: true,
    });
    expect(JSON.stringify(details)).not.toMatch(/RATE_LIMIT|AUTO_ABUSE|abuse/i);
  });

  it('does not mark an administrator ban, even one whose reason text copies the prefix', async () => {
    const error = await gate
      .assertNotBanned({
        id: 'u1',
        bannedAt: hourAgo,
        bannedUntil: null,
        banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED',
        bannedByUserId: 'admin-1',
      })
      .catch((e: unknown) => e);
    expect((error as AccountBannedException).getResponse()).toMatchObject({
      details: { banPermanent: true, bannedUntil: null },
    });
    expect(
      ((error as AccountBannedException).getResponse() as { details: object }).details,
    ).not.toHaveProperty('autoSuspended');
  });

  it('lets an expired timed ban through and clears the stale columns', async () => {
    await expect(
      gate.assertNotBanned({
        id: 'u1',
        bannedAt: hourAgo,
        bannedUntil: new Date(Date.now() - 1000),
      }),
    ).resolves.toBeUndefined();
    expect(clearBan).toHaveBeenCalledWith('u1');
  });

  it('still lets an expired ban through when the cleanup write fails', async () => {
    clearBan.mockRejectedValue(new Error('db down'));
    await expect(
      gate.assertNotBanned({
        id: 'u1',
        bannedAt: hourAgo,
        bannedUntil: new Date(Date.now() - 1000),
      }),
    ).resolves.toBeUndefined();
  });
});
