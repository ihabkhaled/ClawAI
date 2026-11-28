import { Injectable, Logger } from '@nestjs/common';

import {
  LOGIN_BOT_CHECK_FAILURE_THRESHOLD,
  LOGIN_FAILURE_WINDOW_SECONDS,
} from '../constants/anti-abuse.constants';
import { SOURCE_AUTH_SIGNIN } from '../../abuse-defense/constants/abuse-defense.constants';
import { AbuseSignalCode } from '../../abuse-defense/enums/abuse-signal-code.enum';
import { AbuseSignalService } from '../../abuse-defense/services/abuse-signal.service';
import { BannedDeviceService } from '../../abuse-defense/services/banned-device.service';
import { BotCheckAction } from '../enums/bot-check-action.enum';
import { BotCheckOutcome } from '../enums/bot-check-outcome.enum';
import { SecurityEventAction } from '../enums/security-event-action.enum';
import { AntiAbuseCounterRepository } from '../repositories/anti-abuse-counter.repository';
import type { HashedDevice, LoginScreeningInput, ScreeningOrigin } from '../types/device.types';
import { loginFailureEmailKey, loginFailureIpKey } from '../utilities/anti-abuse-key.utility';
import { botCheckRefusal } from '../utilities/anti-abuse-refusal.utility';
import { BotCheckService } from './bot-check.service';
import { DeviceTrustService } from './device-trust.service';
import { SecurityEventService } from './security-event.service';

/**
 * Sign-in asks for the bot checks only once an IP or an address has
 * LOGIN_BOT_CHECK_FAILURE_THRESHOLD failed sign-ins in the last 15 minutes.
 *
 * The failures are counted in their OWN windows, not read off the route rate
 * limiter: the limiter counts every attempt (successes are refunded or reset
 * later), and it has no address-only window; adding one there would create a
 * lockout a stranger could trigger. Both windows are claimed for whatever
 * address was typed, known or not, so "checks required" reveals nothing about
 * which addresses have accounts (rule 43 §1). Redis down: no checks required.
 */
@Injectable()
export class LoginScreeningService {
  private readonly logger = new Logger(LoginScreeningService.name);

  constructor(
    private readonly botCheck: BotCheckService,
    private readonly counters: AntiAbuseCounterRepository,
    private readonly deviceTrust: DeviceTrustService,
    private readonly events: SecurityEventService,
    private readonly bannedDevices: BannedDeviceService,
    private readonly abuse: AbuseSignalService,
  ) {}

  /** Throws BOT_CHECK_REQUIRED / BOT_CHECK_FAILED when checks are due and missing or wrong. */
  async assertAllowed(
    email: string,
    input: LoginScreeningInput,
    origin: ScreeningOrigin,
  ): Promise<void> {
    if (!(await this.checksRequired(email, origin.ip))) {
      return;
    }
    const verdict = await this.botCheck.evaluate(input.botCheck, BotCheckAction.LOGIN, origin.ip);
    if (verdict.outcome === BotCheckOutcome.PASSED) {
      return;
    }
    const refusal = botCheckRefusal(verdict.outcome);
    this.logger.warn(`assertAllowed: sign-in refused ${refusal.code} (${verdict.reason})`);
    this.events.record(SecurityEventAction.LOGIN_BOT_CHECK_REQUIRED, {
      origin,
      email,
      fingerprintHash: this.deviceTrust.hash(input.device)?.fingerprintHash ?? null,
      code: refusal.code,
      reason: verdict.reason,
    });
    throw refusal;
  }

  /** One wrong password (or unknown address): counted per IP and per address. */
  async recordFailure(email: string, origin: ScreeningOrigin): Promise<void> {
    const keys = [loginFailureEmailKey(email), loginFailureIpKey(origin.ip)];
    await Promise.all(
      keys.map(async (key) =>
        key === null ? null : this.counters.hit(key, LOGIN_FAILURE_WINDOW_SECONDS),
      ),
    );
    this.logger.debug('recordFailure: failed sign-in counted');
  }

  /** The owner got in: the address's failures are forgotten and the device recorded. */
  async recordSuccess(
    userId: string,
    email: string,
    input: LoginScreeningInput,
    origin: ScreeningOrigin,
  ): Promise<void> {
    await this.counters.reset(loginFailureEmailKey(email));
    const device = this.deviceTrust.hash(input.device);
    if (device !== null) {
      await this.deviceTrust.record({ userId, device, origin, seenAt: new Date() });
      await this.flagBannedDevice(userId, email, device, origin);
    }
  }

  /**
   * An EXISTING account signed in on a device a permanently banned account used. Shared family and
   * office machines are normal, so this never blocks or suspends anyone: it leaves evidence for an
   * administrator (a security event and an uncounted abuse signal). Never throws into a sign-in.
   */
  private async flagBannedDevice(
    userId: string,
    email: string,
    device: HashedDevice,
    origin: ScreeningOrigin,
  ): Promise<void> {
    try {
      if (!(await this.bannedDevices.isMarked(device, userId))) {
        return;
      }
      this.events.record(SecurityEventAction.LOGIN_ON_BANNED_DEVICE, {
        origin,
        email,
        fingerprintHash: device.fingerprintHash,
        userId,
      });
      await this.abuse.record({
        userId,
        code: AbuseSignalCode.BANNED_DEVICE_SIGNIN,
        source: SOURCE_AUTH_SIGNIN,
      });
    } catch (error: unknown) {
      this.logger.warn(
        `flagBannedDevice: not flagged: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private async checksRequired(email: string, ip: string | null): Promise<boolean> {
    const keys = [loginFailureEmailKey(email), loginFailureIpKey(ip)];
    const counts = await Promise.all(
      keys.map(async (key) => (key === null ? null : this.counters.read(key))),
    );
    return counts.some((count) => count !== null && count >= LOGIN_BOT_CHECK_FAILURE_THRESHOLD);
  }
}
