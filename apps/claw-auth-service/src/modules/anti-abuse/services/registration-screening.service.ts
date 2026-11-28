import { Injectable, Logger } from '@nestjs/common';

import { BannedDeviceService } from '../../abuse-defense/services/banned-device.service';
import { BotCheckAction } from '../enums/bot-check-action.enum';
import { BotCheckOutcome } from '../enums/bot-check-outcome.enum';
import { EmailDomainVerdict } from '../enums/email-domain-verdict.enum';
import { SecurityEventAction } from '../enums/security-event-action.enum';
import type {
  HashedDevice,
  RegistrationScreeningInput,
  RegistrationVerdict,
  ScreeningOrigin,
} from '../types/device.types';
import type { SecurityEventInput } from '../types/security-event.types';
import {
  bannedDeviceRefusal,
  botCheckRefusal,
  emailDomainRefusal,
  signupLimitedRefusal,
} from '../utilities/anti-abuse-refusal.utility';
import { toRegistrationNetwork } from '../utilities/ip-network.utility';
import { BotCheckService } from './bot-check.service';
import { DeviceTrustService } from './device-trust.service';
import { EmailDomainPolicyService } from './email-domain-policy.service';
import { SecurityEventService } from './security-event.service';
import { SignupVelocityService } from './signup-velocity.service';

/**
 * Everything `POST /auth/register` checks before an account exists, cheapest
 * refusal first: bot check (428/403), email domain (400 on `email`), sign-up
 * velocity (429 + Retry-After). Every refusal writes a security event, then
 * throws. What passes gets its trial decision for account creation.
 *
 * None of these refusals depends on whether the address has an account, so
 * none is an enumeration oracle (rule 43 §1); DUPLICATE_ENTITY stays the one
 * deliberate exception and is answered only after all of them.
 */
@Injectable()
export class RegistrationScreeningService {
  private readonly logger = new Logger(RegistrationScreeningService.name);

  constructor(
    private readonly botCheck: BotCheckService,
    private readonly emailPolicy: EmailDomainPolicyService,
    private readonly velocity: SignupVelocityService,
    private readonly deviceTrust: DeviceTrustService,
    private readonly events: SecurityEventService,
    private readonly bannedDevices: BannedDeviceService,
  ) {}

  async screen(
    input: RegistrationScreeningInput,
    origin: ScreeningOrigin,
  ): Promise<RegistrationVerdict> {
    const device = this.deviceTrust.hash(input.device);
    const event = this.eventInput(input.email, device, origin);
    const bot = await this.botCheck.evaluate(input.botCheck, BotCheckAction.REGISTER, origin.ip);
    if (bot.outcome !== BotCheckOutcome.PASSED) {
      const refusal = botCheckRefusal(bot.outcome);
      this.refuse(SecurityEventAction.SIGNUP_REFUSED_BOT_CHECK, event, refusal.code, bot.reason);
      throw refusal;
    }
    // A device of a permanently banned account cannot open a NEW account (ADR-233). After the bot
    // check, so a script cannot probe devices cheaply; before everything that costs DNS or a counter.
    // The answer depends on the device alone, never on the address, so it is no enumeration oracle.
    if (await this.bannedDevices.isMarked(device)) {
      const refusal = bannedDeviceRefusal();
      this.refuse(SecurityEventAction.SIGNUP_REFUSED_BANNED_DEVICE, event, refusal.code);
      throw refusal;
    }
    const domain = await this.emailPolicy.evaluate(input.email);
    if (domain !== EmailDomainVerdict.ALLOWED) {
      const refusal = emailDomainRefusal(domain);
      this.refuse(SecurityEventAction.SIGNUP_REFUSED_DISPOSABLE, event, refusal.code, domain);
      throw refusal;
    }
    const pace = await this.velocity.consume(device);
    if (!pace.allowed) {
      const refusal = signupLimitedRefusal(pace.retryAfterSeconds);
      this.refuse(SecurityEventAction.SIGNUP_VELOCITY_LIMITED, event, refusal.code);
      throw refusal;
    }
    const trial = await this.deviceTrust.decideTrial(device, toRegistrationNetwork(origin.ip));
    return { device, trial };
  }

  /**
   * After the account exists: record its device, and log the trial refusal.
   * Never throws; the account is already complete.
   */
  async recordSignup(
    userId: string,
    email: string,
    verdict: RegistrationVerdict,
    origin: ScreeningOrigin,
  ): Promise<void> {
    if (verdict.device !== null) {
      await this.deviceTrust.record({ userId, device: verdict.device, origin, seenAt: new Date() });
    }
    if (!verdict.trial.grant) {
      this.events.record(SecurityEventAction.TRIAL_DENIED_SHARED_DEVICE, {
        ...this.eventInput(email, verdict.device, origin),
        reason: verdict.trial.reason,
        userId,
      });
    }
  }

  private refuse(
    action: SecurityEventAction,
    event: SecurityEventInput,
    code: string,
    reason?: string,
  ): void {
    this.logger.warn(
      `screen: sign-up refused ${code}${reason === undefined ? '' : ` (${reason})`}`,
    );
    this.events.record(action, { ...event, code, reason });
  }

  private eventInput(
    email: string,
    device: HashedDevice | null,
    origin: ScreeningOrigin,
  ): SecurityEventInput {
    return { origin, email, fingerprintHash: device?.fingerprintHash ?? null };
  }
}
