import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { BannedDeviceHashKind } from '../enums/banned-device-hash-kind.enum';
import type { DeviceMarkInput } from '../types/abuse-defense.types';
import type { HashedDevice } from '../../anti-abuse/types/device.types';

/** `banned_device_marks`. A mark is active while `lifted_at` is null; lifting is reversible by marking again. */
@Injectable()
export class BannedDeviceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Marks the hashes, idempotently. A mark an administrator lifted earlier for the same account is
   * made active again (the account was banned for life a second time), not duplicated.
   */
  async markMany(marks: readonly DeviceMarkInput[]): Promise<void> {
    if (marks.length === 0) {
      return;
    }
    await this.prisma.$transaction([
      this.prisma.bannedDeviceMark.createMany({
        data: marks.map((mark) => ({
          hashKind: mark.kind,
          hashValue: mark.value,
          sourceUserId: mark.sourceUserId,
          reasonCode: mark.reason,
        })),
        skipDuplicates: true,
      }),
      this.prisma.bannedDeviceMark.updateMany({
        where: {
          liftedAt: { not: null },
          OR: marks.map((mark) => ({
            hashKind: mark.kind,
            hashValue: mark.value,
            sourceUserId: mark.sourceUserId,
          })),
        },
        data: { liftedAt: null },
      }),
    ]);
  }

  /** The source account was unbanned: its marks stop refusing sign-ups. Returns how many were active. */
  async liftBySource(sourceUserId: string, now: Date): Promise<number> {
    const result = await this.prisma.bannedDeviceMark.updateMany({
      where: { sourceUserId, liftedAt: null },
      data: { liftedAt: now },
    });
    return result.count;
  }

  /** Active marks on either hash of this device, ignoring the ones the given account itself caused. */
  async countActiveFor(device: HashedDevice, exceptSourceUserId?: string): Promise<number> {
    return this.prisma.bannedDeviceMark.count({
      where: {
        liftedAt: null,
        ...(exceptSourceUserId === undefined ? {} : { sourceUserId: { not: exceptSourceUserId } }),
        OR: [
          { hashKind: BannedDeviceHashKind.FINGERPRINT, hashValue: device.fingerprintHash },
          { hashKind: BannedDeviceHashKind.DEVICE_ID, hashValue: device.deviceIdHash },
        ],
      },
    });
  }
}
