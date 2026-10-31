import { Injectable, Logger } from '@nestjs/common';
import { AccountBannedException } from '../../../common/errors';
import { UsersRepository } from '../../users/repositories/users.repository';
import { resolveBanState } from '../../users/service.utilities/ban-state.utility';
import { type BannableUser } from '../../users/types/user-admin.types';

/**
 * The one place an admin ban stops a sign-in or a refresh (ADR-200). It decides
 * from the clock, so a timed ban lifts itself: an EXPIRED ban lets the caller
 * through and clears the stale columns (best effort - the answer never depends
 * on the cleanup). Throws ACCOUNT_BANNED, with the end date, while it is live.
 */
@Injectable()
export class AccountBanGateService {
  private readonly logger = new Logger(AccountBanGateService.name);

  constructor(private readonly usersRepository: UsersRepository) {}

  async assertNotBanned(user: BannableUser): Promise<void> {
    const state = resolveBanState({
      bannedAt: user.bannedAt ?? null,
      bannedUntil: user.bannedUntil ?? null,
    });
    if (state.status === 'ACTIVE') {
      throw new AccountBannedException(state.until);
    }
    if (state.status === 'EXPIRED') {
      try {
        await this.usersRepository.clearBan(user.id);
        this.logger.log(`ban lifted by expiry for user ${user.id}`);
      } catch (error: unknown) {
        this.logger.warn(
          `expired ban not cleared for user ${user.id}: ${error instanceof Error ? error.message : 'unknown error'}`,
        );
      }
    }
  }
}
