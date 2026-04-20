import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  REFRESH_CLEANUP_INTERVAL_MS,
  REFRESH_RETENTION_DAYS,
} from '../../../common/constants/auth.constants';
import { RefreshTokenRepository } from '../repositories/refresh-token.repository';

@Injectable()
export class RefreshCleanupManager {
  private readonly logger = new Logger(RefreshCleanupManager.name);

  constructor(private readonly repo: RefreshTokenRepository) {}

  @Interval(REFRESH_CLEANUP_INTERVAL_MS)
  async purge(): Promise<void> {
    const cutoff = new Date(Date.now() - REFRESH_RETENTION_DAYS * 24 * 60 * 60 * 1_000);
    const count = await this.repo.purgeExpired(cutoff);
    if (count > 0) this.logger.log(`Purged ${count} expired refresh token(s)`);
  }
}
