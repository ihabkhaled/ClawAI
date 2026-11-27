import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../../app/config/app.config';
import { deriveScopedKey } from '../../../common/utilities/scoped-token.utility';
import {
  DEVICE_PEPPER_KEY_CONTEXT,
  NETWORK_TRIAL_LIMIT,
  NETWORK_TRIAL_WINDOW_MS,
} from '../constants/anti-abuse.constants';
import { TrialDecisionReason } from '../enums/trial-decision-reason.enum';
import { UserDeviceRepository } from '../repositories/user-device.repository';
import type {
  DeviceInput,
  DeviceRecordInput,
  HashedDevice,
  TrialDecision,
} from '../types/device.types';
import { hashDevice } from '../utilities/device-hash.utility';

/**
 * One free trial per device (owner decision 2026-11-27). Any number of accounts
 * may register; an account starts with its trial already over when:
 * - it sent no device object (old client or API script: untrusted);
 * - any account seen on the same fingerprint OR device id already redeemed a
 *   trial (granted or refused, it is the device that has had its turn);
 * - its registration /24 (IPv6 /48) produced NETWORK_TRIAL_LIMIT redemptions in
 *   the last 24 h (a heavily reused network).
 * Device identifiers are compared as peppered hashes only.
 */
@Injectable()
export class DeviceTrustService {
  private readonly logger = new Logger(DeviceTrustService.name);

  constructor(private readonly devices: UserDeviceRepository) {}

  hash(device: DeviceInput | undefined): HashedDevice | null {
    return hashDevice(device, this.pepper());
  }

  async decideTrial(
    device: HashedDevice | null,
    network: string | null,
    now: Date = new Date(),
  ): Promise<TrialDecision> {
    if (device === null) {
      return { grant: false, reason: TrialDecisionReason.MISSING_DEVICE };
    }
    if ((await this.devices.countTrialsSharingDevice(device)) > 0) {
      return { grant: false, reason: TrialDecisionReason.SHARED_DEVICE };
    }
    if (network !== null) {
      const since = new Date(now.getTime() - NETWORK_TRIAL_WINDOW_MS);
      const recent = await this.devices.countNetworkTrialsSince(network, since);
      if (recent >= NETWORK_TRIAL_LIMIT) {
        return { grant: false, reason: TrialDecisionReason.SHARED_NETWORK };
      }
    }
    return { grant: true, reason: TrialDecisionReason.GRANTED };
  }

  /**
   * Records the device for the account. Never throws: a sign-in or sign-up that
   * already succeeded must not fail on bookkeeping. Logged loudly, because a
   * missing row lets the next account on that device have a trial.
   */
  async record(input: DeviceRecordInput): Promise<void> {
    try {
      await this.devices.upsert(input);
      this.logger.log(`record: device recorded for user ${input.userId}`);
    } catch (error: unknown) {
      this.logger.error(
        `record: device could not be recorded for user ${input.userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  /** The device pepper, derived from ENCRYPTION_KEY (never rotated in place). */
  private pepper(): string {
    return deriveScopedKey(AppConfig.get().ENCRYPTION_KEY, DEVICE_PEPPER_KEY_CONTEXT);
  }
}
