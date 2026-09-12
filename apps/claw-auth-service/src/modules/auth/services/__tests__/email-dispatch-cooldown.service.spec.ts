import { createHash } from 'node:crypto';
import { EMAIL_DISPATCH_COOLDOWN_PREFIX } from '../../constants/email-dispatch-cooldown.constants';
import { EmailDispatchPurpose } from '../../enums/email-dispatch-purpose.enum';
import { EmailDispatchCooldownService } from '../email-dispatch-cooldown.service';
import type { RedisService } from '../../../../infrastructure/redis/redis.service';

function build(): {
  service: EmailDispatchCooldownService;
  redis: { claimCooldown: jest.Mock };
} {
  const redis = { claimCooldown: jest.fn() };
  return {
    service: new EmailDispatchCooldownService(redis as unknown as RedisService),
    redis,
  };
}

describe('EmailDispatchCooldownService', () => {
  it('returns 0 when the window was free', async () => {
    const ctx = build();
    ctx.redis.claimCooldown.mockResolvedValue(null);

    await expect(
      ctx.service.claim(EmailDispatchPurpose.PASSWORD_RESET, 'ada@example.com', 120),
    ).resolves.toBe(0);
  });

  it('returns the remaining seconds when the window is held', async () => {
    const ctx = build();
    ctx.redis.claimCooldown.mockResolvedValue(37);

    await expect(
      ctx.service.claim(EmailDispatchPurpose.PASSWORD_RESET, 'ada@example.com', 120),
    ).resolves.toBe(37);
  });

  it('hashes the address into the key rather than storing it', async () => {
    const ctx = build();
    ctx.redis.claimCooldown.mockResolvedValue(null);

    await ctx.service.claim(EmailDispatchPurpose.EMAIL_VERIFICATION, 'Ada@Example.COM ', 60);

    const key = ctx.redis.claimCooldown.mock.calls[0]?.[0] as string;
    expect(key).not.toContain('Ada@Example.COM');
    expect(key).not.toContain('ada@example.com');
    expect(key).toBe(
      `${EMAIL_DISPATCH_COOLDOWN_PREFIX}${EmailDispatchPurpose.EMAIL_VERIFICATION}:${createHash(
        'sha256',
      )
        .update('ada@example.com')
        .digest('hex')}`,
    );
  });

  it('treats differently-cased spellings of one address as one window', async () => {
    const ctx = build();
    ctx.redis.claimCooldown.mockResolvedValue(null);

    await ctx.service.claim(EmailDispatchPurpose.PASSWORD_RESET, 'ada@example.com', 120);
    await ctx.service.claim(EmailDispatchPurpose.PASSWORD_RESET, '  ADA@EXAMPLE.COM  ', 120);

    expect(ctx.redis.claimCooldown.mock.calls[0]?.[0]).toBe(
      ctx.redis.claimCooldown.mock.calls[1]?.[0],
    );
  });

  // A reset request and a confirmation resend are different actions a user may
  // legitimately need minutes apart; one must not consume the other's window.
  it('keeps a separate window per purpose for the same address', async () => {
    const ctx = build();
    ctx.redis.claimCooldown.mockResolvedValue(null);

    await ctx.service.claim(EmailDispatchPurpose.PASSWORD_RESET, 'ada@example.com', 120);
    await ctx.service.claim(EmailDispatchPurpose.EMAIL_VERIFICATION, 'ada@example.com', 60);

    expect(ctx.redis.claimCooldown.mock.calls[0]?.[0]).not.toBe(
      ctx.redis.claimCooldown.mock.calls[1]?.[0],
    );
  });

  // Deliberate fail-OPEN, unlike the PAYG meter. This limiter is a courtesy
  // against spam, not an authorization decision — a Redis outage must not stop
  // somebody confirming their address or resetting their password.
  it('allows the send when the rate limiter itself is unavailable', async () => {
    const ctx = build();
    ctx.redis.claimCooldown.mockRejectedValue(new Error('redis unreachable'));

    await expect(
      ctx.service.claim(EmailDispatchPurpose.PASSWORD_RESET, 'ada@example.com', 120),
    ).resolves.toBe(0);
  });
});
