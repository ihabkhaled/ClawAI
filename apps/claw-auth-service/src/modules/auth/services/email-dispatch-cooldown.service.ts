import { createHash } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../infrastructure/redis/redis.service';
import { EMAIL_DISPATCH_COOLDOWN_PREFIX } from '../constants/email-dispatch-cooldown.constants';
import type { EmailDispatchPurpose } from '../enums/email-dispatch-purpose.enum';

/**
 * The one place an address-triggered email is rate-limited.
 *
 * Both endpoints that will email whoever you name — resend confirmation and
 * request password reset — have the same problem and therefore share the same
 * answer. Two separate implementations would drift, and the way this one fails
 * is silent: a cooldown applied slightly differently in one of them becomes an
 * account-enumeration oracle without anything turning red.
 *
 * **The window is claimed for the SUBMITTED ADDRESS, before the caller knows
 * whether an account exists.** That ordering is the security property. If the
 * cooldown only applied to real accounts, then submitting an address twice and
 * seeing no cooldown would answer the exact question these endpoints exist to
 * refuse: is this address registered here? (rule 43 §1, ADR-096.)
 *
 * The purpose is part of the key, so a password-reset request does not consume
 * the confirmation-resend window for the same person — they are different
 * actions a user may legitimately need minutes apart.
 */
@Injectable()
export class EmailDispatchCooldownService {
  private readonly logger = new Logger(EmailDispatchCooldownService.name);

  constructor(private readonly redis: RedisService) {}

  /**
   * Claim the window. Returns the seconds the caller must wait before another
   * dispatch will do anything — `0` when the claim was taken and the caller
   * should proceed.
   *
   * Never throws. If Redis is unreachable the claim is treated as taken: an
   * outage in the rate limiter must not stop a user confirming their address or
   * resetting their password. That is a deliberate fail-open, and it is safe
   * precisely because the limiter is a courtesy against spam, not an
   * authorization decision — unlike the PAYG meter (rule 37), which fails
   * closed because it guards money.
   */
  async claim(
    purpose: EmailDispatchPurpose,
    email: string,
    cooldownSeconds: number,
  ): Promise<number> {
    try {
      const remaining = await this.redis.claimCooldown(this.key(purpose, email), cooldownSeconds);
      if (remaining !== null) {
        // Never logs the address. A rate-limit log line is otherwise a slow
        // leak of exactly the list these endpoints protect.
        this.logger.log(`dispatch cooldown active for purpose=${purpose}`);
        return remaining;
      }
      return 0;
    } catch (error: unknown) {
      this.logger.warn(
        `dispatch cooldown unavailable for purpose=${purpose}, allowing the send — ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return 0;
    }
  }

  // The address is hashed, never embedded: a Redis keyspace dump must not be a
  // readable list of who has been signing up or resetting a password. Plain
  // SHA-256 rather than a keyed hash because this is namespacing, not a
  // credential, and it has to be derivable from the address alone every time.
  // Normalised first, so `Ada@Example.com` and `ada@example.com` share a window
  // — they are one address, and treating them as two halves the limit.
  private key(purpose: EmailDispatchPurpose, email: string): string {
    const digest = createHash('sha256').update(email.trim().toLowerCase()).digest('hex');
    return `${EMAIL_DISPATCH_COOLDOWN_PREFIX}${purpose}:${digest}`;
  }
}
