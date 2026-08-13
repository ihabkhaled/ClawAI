import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { AuthEmailAdapter } from '../adapters/auth-email.adapter';
import { AuthRepository } from '../repositories/auth.repository';
import { EmailVerificationRepository } from '../repositories/email-verification.repository';
import {
  EMAIL_VERIFICATION_TOKEN_BYTES,
  EMAIL_VERIFICATION_TOKEN_TTL_MS,
} from '../constants/email-verification.constants';

@Injectable()
export class EmailVerificationService {
  constructor(
    private readonly repository: EmailVerificationRepository,
    private readonly authRepository: AuthRepository,
    private readonly emailAdapter: AuthEmailAdapter,
  ) {}

  async sendForUser(userId: string, email: string): Promise<void> {
    const rawToken = randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
    await this.repository.replaceForUser(userId, {
      tokenHash: this.hash(rawToken),
      expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
    });
    await this.emailAdapter.sendVerification(email, rawToken);
  }

  async resend(email: string): Promise<{ accepted: true }> {
    const user = await this.authRepository.findUserByEmail(email);
    if (user && !user.emailVerifiedAt) await this.sendForUser(user.id, user.email);
    return { accepted: true };
  }

  async verify(rawToken: string): Promise<{ verified: boolean }> {
    return { verified: await this.repository.consumeAndActivate(this.hash(rawToken)) };
  }

  private hash(rawToken: string): string {
    return hashBearerToken(rawToken, `email-verification:${AppConfig.get().JWT_SECRET}`);
  }
}
