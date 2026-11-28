import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { hashBearerToken } from '@claw/shared-utilities';
import { AppConfig } from '../../../app/config/app.config';
import { hashPassword } from '../../../common/utilities';
import { SessionTerminationReason } from '../../sessions/enums/session-termination-reason.enum';
import { UsersRepository } from '../../users/repositories/users.repository';
import { validatePasswordStrength } from '../../users/service.utilities/password-policy.utility';
import {
  MILLISECONDS_PER_SECOND,
  PASSWORD_RESET_TOKEN_BYTES,
  PASSWORD_RESET_TOKEN_TTL_SECONDS,
} from '../constants/password-reset.constants';
import { AuthRepository } from '../repositories/auth.repository';
import { PasswordResetRepository } from '../repositories/password-reset.repository';
import { SessionRevocationCacheService } from '../services/session-revocation-cache.service';

@Injectable()
export class PasswordResetManager {
  constructor(
    private readonly resetRepository: PasswordResetRepository,
    private readonly authRepository: AuthRepository,
    private readonly usersRepository: UsersRepository,
    private readonly revocationCache: SessionRevocationCacheService,
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
    const pending = await this.resetRepository.findActiveByTokenHash(tokenHash);
    if (pending === null) {
      return false;
    }

    // The single-use claim comes FIRST. It used to come after the password write, so two requests
    // carrying the same token both rewrote the password and only the loser was told it failed.
    const consumed = await this.resetRepository.consume(pending.id);
    if (!consumed) {
      return false;
    }

    const passwordHash = await hashPassword(newPassword);
    await this.usersRepository.updateById(pending.userId, {
      passwordHash,
      mustChangePassword: false,
    });

    // Close every login (the rows stay, with their reason, for the admin sessions view - ADR-204) and
    // publish the ids: a reset exists to shut an intruder out, and a deleted row left the intruder's
    // access token working for up to 15 minutes (ADR-112).
    await this.revocationCache.revoke(
      await this.usersRepository.revokeSessionsReturningIds(
        pending.userId,
        SessionTerminationReason.PASSWORD_CHANGED,
      ),
    );

    return true;
  }
}
