import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { EmailDispatchCooldownService } from './email-dispatch-cooldown.service';
import { EmailDispatchPurpose } from '../enums/email-dispatch-purpose.enum';
import { AuthEmailAdapter } from '../adapters/auth-email.adapter';
import { AuthEmailRecipientService } from './auth-email-recipient.service';
import { AuthRepository } from '../repositories/auth.repository';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import {
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
} from '../constants/email-verification.constants';
import type { ResendVerificationResult } from '../types/email-verification.types';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly authRepository: AuthRepository,
    private readonly emailAdapter: AuthEmailAdapter,
    private readonly recipients: AuthEmailRecipientService,
    private readonly cooldown: EmailDispatchCooldownService,
  ) {}

  async sendForUser(userId: string, email: string): Promise<void> {
    const rawToken = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
    await this.repository.replaceForUser(userId, {
      tokenHash: this.hash(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
    });
    await this.emailAdapter.sendVerification(
      await this.recipients.forUserId(userId, email),
      rawToken,
    );
  }

  /**
   * Send another confirmation link, at most once per cooldown window.
   *
   * The order here is load-bearing. The cooldown is claimed FIRST, for the
   * submitted address, before anything looks the account up — so the rate limit
   * applies identically to an address that exists, one that is already
   * verified, and one that has never been seen. A cooldown that only applied to
   * real accounts would answer the exact question this endpoint refuses to
   * answer: whether that address is registered (rule 43 §1, ADR-096).
   *
   * Every response carries `retryAfterSeconds`, including the one that sent an
   * email, because a field that appears only when rate-limited is itself a
   * signal.
   */
  async resend(email: string): Promise<ResendVerificationResult> {
    const remaining = await this.cooldown.claim(
      EmailDispatchPurpose.EMAIL_VERIFICATION,
      email,
      EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    );
    if (remaining > 0) {
      return { accepted: true, retryAfterSeconds: remaining };
    }

    const user = await this.authRepository.findUserByEmail(email);
    if (user && !user.emailVerifiedAt) {
      await this.sendForUser(user.id, user.email);
    }
    return { accepted: true, retryAfterSeconds: EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS };
  }

  async verify(rawToken: string): Promise<{ verified: boolean }> {
    return { verified: await this.repository.consumeAndActivate(this.hash(rawToken)) };
  }

  private hash(rawToken: string): string {
    return hashBearerToken(rawToken, `email-verification:${AppConfig.get().JWT_SECRET}`);
  }
}
