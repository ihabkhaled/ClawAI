import { Injectable, Logger } from '@nestjs/common';
import { PasswordResetManager } from '../managers/password-reset.manager';
import { AuthEmailAdapter } from '../adapters/auth-email.adapter';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    private readonly manager: PasswordResetManager,
    private readonly emailAdapter: AuthEmailAdapter,
  ) {}

  async requestReset(email: string): Promise<{ accepted: true }> {
    const rawToken = await this.manager.request(email);
    if (rawToken) {
      try {
        await this.emailAdapter.sendPasswordReset(email, rawToken);
      } catch (err) {
        this.logger.error(
          `Password reset email delivery failed: ${err instanceof Error ? err.message : String(err)}`,
          err instanceof Error ? err : undefined,
        );
      }
    }
    this.logger.log('Password reset requested');
    return { accepted: true };
  }

  async confirmReset(token: string, password: string): Promise<{ reset: boolean }> {
    return { reset: await this.manager.confirm(token, password) };
  }
}
