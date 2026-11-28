import { Injectable, Logger } from '@nestjs/common';

import type { HashedDevice } from '../../anti-abuse/types/device.types';
import { UserDeviceRepository } from '../../anti-abuse/repositories/user-device.repository';
import { BannedDeviceHashKind } from '../enums/banned-device-hash-kind.enum';
import { DeviceMarkReason } from '../enums/device-mark-reason.enum';
import { BannedDeviceRepository } from '../repositories/banned-device.repository';
import type { DeviceMarkInput } from '../types/abuse-defense.types';
import { AbuseAuditService } from './abuse-audit.service';

/**
 * The devices of permanently banned accounts (ADR-233).
 *
 * - A lifetime ban marks every device hash the account used. A NEW sign-up from a marked
 *   device is refused (RegistrationScreeningService), with a generic code.
 * - Another EXISTING account signing in on a marked device is never banned for it: family and
 *   office machines are shared. It is flagged for an administrator instead.
 * - Unbanning the source account lifts its marks, so the whole thing is reversible.
 *
 * Only the peppered hashes of `user_devices` are used; nothing here sees a raw fingerprint.
 */
@Injectable()
export class BannedDeviceService {
  private readonly logger = new Logger(BannedDeviceService.name);

  constructor(
    private readonly marks: BannedDeviceRepository,
    private readonly devices: UserDeviceRepository,
    private readonly audit: AbuseAuditService,
  ) {}

  /**
   * Marks the banned account's devices. Never throws: the ban already happened and must not turn
   * into an error. Logged loudly, because a missing mark lets the next sign-up on that device through.
   */
  async markForLifetimeBan(
    userId: string,
    reason: DeviceMarkReason = DeviceMarkReason.ADMIN_LIFETIME_BAN,
  ): Promise<number> {
    try {
      const signals = await this.devices.findLinkingSignals(userId);
      if (signals === null) {
        return 0;
      }
      const marks: DeviceMarkInput[] = [
        ...signals.fingerprintHashes.map((value) => ({
          kind: BannedDeviceHashKind.FINGERPRINT,
          value,
          sourceUserId: userId,
          reason,
        })),
        ...signals.deviceIdHashes.map((value) => ({
          kind: BannedDeviceHashKind.DEVICE_ID,
          value,
          sourceUserId: userId,
          reason,
        })),
      ];
      await this.marks.markMany(marks);
      this.audit.deviceMarked({ sourceUserId: userId, marks: marks.length, reason });
      return marks.length;
    } catch (error: unknown) {
      this.logger.error(
        `markForLifetimeBan: devices of user ${userId} could not be marked`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  /** The source account was unbanned: its marks stop refusing sign-ups. Never throws. */
  async liftForUser(userId: string, now: Date = new Date()): Promise<number> {
    try {
      const lifted = await this.marks.liftBySource(userId, now);
      if (lifted > 0) {
        this.audit.deviceMarksLifted({ sourceUserId: userId, lifted });
      }
      return lifted;
    } catch (error: unknown) {
      this.logger.error(
        `liftForUser: device marks of user ${userId} could not be lifted`,
        error instanceof Error ? error.stack : String(error),
      );
      return 0;
    }
  }

  /**
   * Whether this device belongs to a banned account. `exceptUserId` ignores the marks that account
   * itself caused. A device-less request (no `device` object) cannot be matched and is not marked.
   */
  async isMarked(device: HashedDevice | null, exceptUserId?: string): Promise<boolean> {
    return device !== null && (await this.marks.countActiveFor(device, exceptUserId)) > 0;
  }
}
