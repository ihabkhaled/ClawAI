import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { AUTH_CLEANUP_INTERVAL_MS } from '../../../common/constants/auth.constants';
import { PairingRequestRepository } from '../repositories/pairing-request.repository';
import { DeviceCodeRequestRepository } from '../repositories/device-code-request.repository';

@Injectable()
export class PairingCleanupManager {
  private readonly logger = new Logger(PairingCleanupManager.name);

  constructor(
    private readonly pairingRepo: PairingRequestRepository,
    private readonly deviceCodeRepo: DeviceCodeRequestRepository,
  ) {}

  @Interval(AUTH_CLEANUP_INTERVAL_MS)
  async expire(): Promise<void> {
    const now = new Date();
    const pending = await this.pairingRepo.findExpiredPending(now);
    if (pending.length > 0) {
      const count = await this.pairingRepo.markExpired(pending.map((p) => p.id));
      if (count > 0) this.logger.log(`Expired ${count} pairing request(s)`);
    }
    const expired = await this.deviceCodeRepo.findExpiredPending(now);
    if (expired.length > 0) {
      const count = await this.deviceCodeRepo.markExpired(expired.map((r) => r.id));
      if (count > 0) this.logger.log(`Expired ${count} device-code request(s)`);
    }
  }
}
