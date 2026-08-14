import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { hashPassword } from '../../../common/utilities';
import { UsersRepository } from '../../users/repositories/users.repository';
import { validatePasswordStrength } from '../../users/service.utilities/password-policy.utility';
import {
  MILLISECONDS_PER_SECOND,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
} from '../constants/password-reset.constants';
import { AuthRepository } from '../repositories/auth.repository';
import { PasswordResetRepository } from '../repositories/password-reset.repository';

@Injectable()
export class PasswordResetManager {
  constructor(
    private readonly resetRepository: PasswordResetRepository,
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
  ) {}

  async request(email: string): Promise<string | null> {
    const user = await this.authRepository.findUserByEmail(email);
    if (user === null) {
      return null;
    }

    await this.resetRepository.deleteAllForUser(user.id);

    const rawToken = randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString('hex');
    const tokenHash = hashBearerToken(rawToken, `password-reset:${AppConfig.get().JWT_SECRET}`);
    const expiresAt = new Date(
      Date.now() + PASSWORD_RESET_TOKEN_TTL_SECONDS * MILLISECONDS_PER_SECOND,
    );

    await this.resetRepository.create({
      user: { connect: { id: user.id } },
      tokenHash,
      expiresAt,
    });

    return rawToken;
  }

  async confirm(rawToken: string, newPassword: string): Promise<boolean> {
    const passwordPolicyResult = validatePasswordStrength(newPassword);
    if (!passwordPolicyResult.valid) {
      return false;
    }

    const tokenHash = hashBearerToken(rawToken, `password-reset:${AppConfig.get().JWT_SECRET}`);
    const token = await this.resetRepository.findActiveByTokenHash(tokenHash);
    if (token === null) {
      return false;
    }

    const passwordHash = await hashPassword(newPassword);
    await this.usersRepository.updateById(token.userId, {
      passwordHash,
      mustChangePassword: false,
    });

    const consumed = await this.resetRepository.consume(token.id);
    if (!consumed) {
      return false;
    }

    await this.authRepository.deleteSessionsByUserId(token.userId);

    return true;
  }
}
