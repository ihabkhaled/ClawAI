import { Injectable, Logger } from '@nestjs/common';
import { PasswordResetManager } from '../managers/password-reset.manager';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(private readonly manager: PasswordResetManager) {}

  async requestReset(email: string): Promise<{ accepted: true }> {
    await this.manager.request(email);
    this.logger.log('Password reset requested');
    return { accepted: true };
  }

  async confirmReset(token: string, password: string): Promise<{ reset: boolean }> {
    return { reset: await this.manager.confirm(token, password) };
  }
}
