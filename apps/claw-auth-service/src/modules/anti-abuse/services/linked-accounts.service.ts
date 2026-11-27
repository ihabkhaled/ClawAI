import { Injectable, Logger } from '@nestjs/common';

import { EntityNotFoundException } from '../../../common/errors';
import { LinkedAccountReason } from '../enums/linked-account-reason.enum';
import { UserDeviceRepository } from '../repositories/user-device.repository';
import type {
  LinkedAccountsView,
  LinkedAccountView,
  LinkedUserRow,
  LinkingSignals,
} from '../types/linked-accounts.types';

/**
 * Accounts tied to one account by a shared device fingerprint, a shared client
 * device id, or the same registration /24 (IPv6 /48). Admin-only; the view
 * carries no hash and no address, only the accounts and why they are linked.
 * Bounded at LINKED_ACCOUNTS_LIMIT per signal and in total, newest first.
 */
@Injectable()
export class LinkedAccountsService {
  private readonly logger = new Logger(LinkedAccountsService.name);

  constructor(private readonly devices: UserDeviceRepository) {}

  async list(userId: string): Promise<LinkedAccountsView> {
    this.logger.debug(`list: linked accounts of user ${userId}`);
    const signals = await this.devices.findLinkingSignals(userId);
    if (signals === null) {
      throw new EntityNotFoundException('User', userId);
    }
    const reasons = await this.collectReasons(userId, signals);
    const users = reasons.size === 0 ? [] : await this.devices.findUsersByIds([...reasons.keys()]);
    return { accounts: users.map((user) => this.toView(user, reasons.get(user.id) ?? [])) };
  }

  private async collectReasons(
    userId: string,
    signals: LinkingSignals,
  ): Promise<Map<string, LinkedAccountReason[]>> {
    const [byDevice, byDeviceId, byNetwork] = await Promise.all([
      signals.fingerprintHashes.length === 0
        ? []
        : this.devices.findUserIdsByFingerprints(signals.fingerprintHashes, userId),
      signals.deviceIdHashes.length === 0
        ? []
        : this.devices.findUserIdsByDeviceIds(signals.deviceIdHashes, userId),
      signals.registrationNetwork === null
        ? []
        : this.devices.findUserIdsByNetwork(signals.registrationNetwork, userId),
    ]);
    const reasons = new Map<string, LinkedAccountReason[]>();
    const add = (ids: string[], reason: LinkedAccountReason): void => {
      for (const id of ids) {
        reasons.set(id, [...(reasons.get(id) ?? []), reason]);
      }
    };
    add(byDevice, LinkedAccountReason.DEVICE);
    add(byDeviceId, LinkedAccountReason.DEVICE_ID);
    add(byNetwork, LinkedAccountReason.REGISTRATION_IP);
    return reasons;
  }

  private toView(user: LinkedUserRow, reasons: LinkedAccountReason[]): LinkedAccountView {
    return {
      id: user.id,
      email: user.email,
      status: user.status,
      bannedAt: user.bannedAt === null ? null : user.bannedAt.toISOString(),
      createdAt: user.createdAt.toISOString(),
      reasons,
    };
  }
}
