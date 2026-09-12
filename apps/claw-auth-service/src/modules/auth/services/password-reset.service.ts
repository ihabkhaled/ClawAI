import { Injectable, Logger } from '@nestjs/common';
import { PasswordResetManager } from '../managers/password-reset.manager';
import { AuthEmailAdapter } from '../adapters/auth-email.adapter';
import { AuthEmailRecipientService } from './auth-email-recipient.service';
import { EmailDispatchCooldownService } from './email-dispatch-cooldown.service';
import { EmailDispatchPurpose } from '../enums/email-dispatch-purpose.enum';
import { PASSWORD_RESET_COOLDOWN_SECONDS } from '../constants/email-dispatch-cooldown.constants';
import type { RequestPasswordResetResult } from '../types/password-reset.types';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly manager: PasswordResetManager,
    private readonly emailAdapter: AuthEmailAdapter,
    private readonly recipients: AuthEmailRecipientService,
    private readonly cooldown: EmailDispatchCooldownService,
  ) {}

  /**
   * Send a reset link, at most once per cooldown window.
   *
   * The cooldown is claimed for the submitted address FIRST, before the manager
   * looks anything up — same ordering, same reason as the confirmation resend
   * (rule 43 §1). Without it, this endpoint is a free email cannon pointed at
   * any address an attacker names, and the presence or absence of a limit would
   * itself say whether that address has an account.
   */
  async requestReset(email: string): Promise<RequestPasswordResetResult> {
    const remaining = await this.cooldown.claim(
      EmailDispatchPurpose.PASSWORD_RESET,
      email,
      PASSWORD_RESET_COOLDOWN_SECONDS,
    );
    if (remaining > 0) {
      this.logger.log('Password reset refused: address is within its cooldown window');
      return { accepted: true, retryAfterSeconds: remaining };
    }

    const rawToken = await this.manager.request(email);
    if (rawToken) {
      try {
        await this.emailAdapter.sendPasswordReset(await this.recipients.forEmail(email), rawToken);
      } catch (err) {
        this.logger.error(
          `Password reset email delivery failed: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err : undefined,
        );
      }
    }
    this.logger.log('Password reset requested');
    return { accepted: true, retryAfterSeconds: PASSWORD_RESET_COOLDOWN_SECONDS };
  }

  async confirmReset(token: string, password: string): Promise<{ reset: boolean }> {
    return { reset: await this.manager.confirm(token, password) };
  }
}
