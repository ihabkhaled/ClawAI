import { Injectable, Logger } from '@nestjs/common';

import {
  SIGNUP_DEVICE_WINDOW_SECONDS,
  SIGNUP_GLOBAL_KEY,
  SIGNUP_GLOBAL_WINDOW_SECONDS,
} from '../constants/anti-abuse.constants';
import { AntiAbuseCounterRepository } from '../repositories/anti-abuse-counter.repository';
import type { VelocityDecision } from '../types/anti-abuse-counter.types';
import type { HashedDevice } from '../types/device.types';
import { signupDeviceKeys } from '../utilities/anti-abuse-key.utility';
import { SecuritySettingsService } from './security-settings.service';

/**
 * Sign-up velocity: at most `security.signup.maxPer10Min` sign-ups across the
 * whole platform per fixed 10-minute window, and `maxPerDevicePerDay` per device
 * (fingerprint OR device id) per 24 h. Counted only for an attempt that already
 * passed the bot check and the email-domain check, so a flood of refused bots
 * cannot spend the budget real people need. The device windows are counted
 * first: a device over its limit does not spend the platform's budget either.
 * Redis down: not counted, allowed (fail open, logged by the repository).
 */
@Injectable()
export class SignupVelocityService {
  private readonly logger = new Logger(SignupVelocityService.name);

  constructor(
    private readonly settings: SecuritySettingsService,
    private readonly counters: AntiAbuseCounterRepository,
  ) {}

  async consume(device: HashedDevice | null): Promise<VelocityDecision> {
    const { signupMaxPer10Min, signupMaxPerDevicePerDay } = await this.settings.resolve();
    const deviceKeys = device === null ? [] : signupDeviceKeys(device);
    const deviceWait = await this.hitAll(
      deviceKeys,
      SIGNUP_DEVICE_WINDOW_SECONDS,
      signupMaxPerDevicePerDay,
    );
    if (deviceWait > 0) {
      this.logger.warn(`consume: per-device sign-up limit reached, retryAfter=${deviceWait}s`);
      return { allowed: false, retryAfterSeconds: deviceWait };
    }
    const globalWait = await this.hitAll(
      [SIGNUP_GLOBAL_KEY],
      SIGNUP_GLOBAL_WINDOW_SECONDS,
      signupMaxPer10Min,
    );
    if (globalWait > 0) {
      this.logger.warn(`consume: platform sign-up limit reached, retryAfter=${globalWait}s`);
      return { allowed: false, retryAfterSeconds: globalWait };
    }
    return { allowed: true };
  }

  /** The longest wait among the windows now over `limit`, or 0 when none is. */
  private async hitAll(keys: string[], windowSeconds: number, limit: number): Promise<number> {
    const hits = await Promise.all(keys.map((key) => this.counters.hit(key, windowSeconds)));
    const waits = hits.map((hit) =>
      hit !== null && hit.count > limit ? Math.max(1, hit.ttlSeconds) : 0,
    );
    return Math.max(0, ...waits);
  }
}
