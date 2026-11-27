import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { LINKED_ACCOUNTS_LIMIT } from '../constants/anti-abuse.constants';
import type { DeviceRecordInput, HashedDevice } from '../types/device.types';
import type { LinkedUserRow, LinkingSignals } from '../types/linked-accounts.types';

/**
 * `user_devices` plus the two trial reads the one-trial-per-device rule needs.
 * Pure data access: what a count MEANS is the DeviceTrustService's decision.
 * Every list is bounded by LINKED_ACCOUNTS_LIMIT.
 */
@Injectable()
export class UserDeviceRepository {
  private readonly logger = new Logger(UserDeviceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /** One row per (user, fingerprint): first sight creates it, every later one refreshes it. */
  async upsert(input: DeviceRecordInput): Promise<void> {
    const { userId, device, origin, seenAt } = input;
    this.logger.debug(`upsert: device row for user ${userId}`);
    await this.prisma.userDevice.upsert({
      where: { userId_fingerprintHash: { userId, fingerprintHash: device.fingerprintHash } },
      create: {
        userId,
        fingerprintHash: device.fingerprintHash,
        deviceIdHash: device.deviceIdHash,
        firstIp: origin.ip,
        lastIp: origin.ip,
        userAgent: origin.userAgent,
        countryCode: origin.countryCode,
        firstSeenAt: seenAt,
        lastSeenAt: seenAt,
      },
      update: {
        deviceIdHash: device.deviceIdHash,
        lastIp: origin.ip,
        userAgent: origin.userAgent,
        countryCode: origin.countryCode,
        lastSeenAt: seenAt,
      },
    });
  }

  /** Trial redemptions held by ANY account seen on this fingerprint or device id. */
  async countTrialsSharingDevice(device: HashedDevice): Promise<number> {
    return this.prisma.planTrialRedemption.count({
      where: {
        user: {
          devices: {
            some: {
              OR: [
                { fingerprintHash: device.fingerprintHash },
                { deviceIdHash: device.deviceIdHash },
              ],
            },
          },
        },
      },
    });
  }

  /** Trial redemptions started since `since` by accounts registered from `network`. */
  async countNetworkTrialsSince(network: string, since: Date): Promise<number> {
    return this.prisma.planTrialRedemption.count({
      where: { startedAt: { gte: since }, user: { registrationNetwork: network } },
    });
  }

  /** The inspected account's device hashes and registration network; null when it does not exist. */
  async findLinkingSignals(userId: string): Promise<LinkingSignals | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        registrationNetwork: true,
        devices: { select: { fingerprintHash: true, deviceIdHash: true } },
      },
    });
    return user === null
      ? null
      : {
          fingerprintHashes: user.devices.map((d) => d.fingerprintHash),
          deviceIdHashes: user.devices.map((d) => d.deviceIdHash),
          registrationNetwork: user.registrationNetwork,
        };
  }

  async findUserIdsByFingerprints(hashes: string[], excludeUserId: string): Promise<string[]> {
    const rows = await this.prisma.userDevice.findMany({
      where: { fingerprintHash: { in: hashes }, userId: { not: excludeUserId } },
      select: { userId: true },
      distinct: ['userId'],
      take: LINKED_ACCOUNTS_LIMIT,
    });
    return rows.map((row) => row.userId);
  }

  async findUserIdsByDeviceIds(hashes: string[], excludeUserId: string): Promise<string[]> {
    const rows = await this.prisma.userDevice.findMany({
      where: { deviceIdHash: { in: hashes }, userId: { not: excludeUserId } },
      select: { userId: true },
      distinct: ['userId'],
      take: LINKED_ACCOUNTS_LIMIT,
    });
    return rows.map((row) => row.userId);
  }

  async findUserIdsByNetwork(network: string, excludeUserId: string): Promise<string[]> {
    const rows = await this.prisma.user.findMany({
      where: { registrationNetwork: network, id: { not: excludeUserId } },
      select: { id: true },
      orderBy: { createdAt: 'desc' },
      take: LINKED_ACCOUNTS_LIMIT,
    });
    return rows.map((row) => row.id);
  }

  async findUsersByIds(ids: string[]): Promise<LinkedUserRow[]> {
    return this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true, status: true, bannedAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: LINKED_ACCOUNTS_LIMIT,
    });
  }
}
