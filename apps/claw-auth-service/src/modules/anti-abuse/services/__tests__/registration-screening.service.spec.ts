import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { BotCheckAction } from '../../enums/bot-check-action.enum';
import { BotCheckOutcome } from '../../enums/bot-check-outcome.enum';
import { BotCheckReason } from '../../enums/bot-check-reason.enum';
import { EmailDomainVerdict } from '../../enums/email-domain-verdict.enum';
import { SecurityEventAction } from '../../enums/security-event-action.enum';
import { TrialDecisionReason } from '../../enums/trial-decision-reason.enum';
import { type BannedDeviceService } from '../../../abuse-defense/services/banned-device.service';
import { type BotCheckService } from '../bot-check.service';
import { type DeviceTrustService } from '../device-trust.service';
import { type EmailDomainPolicyService } from '../email-domain-policy.service';
import { RegistrationScreeningService } from '../registration-screening.service';
import { type SecurityEventService } from '../security-event.service';
import { type SignupVelocityService } from '../signup-velocity.service';

const ORIGIN = { ip: '203.0.113.9', countryCode: 'NL', userAgent: 'python-requests/2.31' };
const HASHED = {
  fingerprintHash: '0123456789'.repeat(6).slice(0, 64),
  deviceIdHash: 'd'.repeat(64),
};
const INPUT = {
  email: 'bot@example.com',
  botCheck: { pow: { token: 't.s', nonce: '7' } },
  device: { fingerprint: 'a'.repeat(64), deviceId: 'device-0001' },
};
const PASSED = { outcome: BotCheckOutcome.PASSED, reason: BotCheckReason.PASSED };

describe('RegistrationScreeningService', () => {
  let evaluateBot: Mock;
  let evaluateDomain: Mock;
  let consume: Mock;
  let deviceTrust: { hash: Mock; decideTrial: Mock; record: Mock };
  let record: Mock;
  let isMarked: Mock;
  let service: RegistrationScreeningService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    evaluateBot = vi.fn().mockResolvedValue(PASSED);
    evaluateDomain = vi.fn().mockResolvedValue(EmailDomainVerdict.ALLOWED);
    consume = vi.fn().mockResolvedValue({ allowed: true });
    deviceTrust = {
      hash: vi.fn().mockReturnValue(HASHED),
      decideTrial: vi.fn().mockResolvedValue({ grant: true, reason: TrialDecisionReason.GRANTED }),
      record: vi.fn().mockResolvedValue(undefined),
    };
    record = vi.fn();
    isMarked = vi.fn().mockResolvedValue(false);
    service = new RegistrationScreeningService(
      { evaluate: evaluateBot } as unknown as BotCheckService,
      { evaluate: evaluateDomain } as unknown as EmailDomainPolicyService,
      { consume } as unknown as SignupVelocityService,
      deviceTrust as unknown as DeviceTrustService,
      { record } as unknown as SecurityEventService,
      { isMarked } as unknown as BannedDeviceService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('refuses a sign-up from the device of a banned account with a generic 403 and a security event', async () => {
    isMarked.mockResolvedValue(true);
    await expect(service.screen(INPUT, ORIGIN)).rejects.toMatchObject({
      code: 'SIGNUP_UNAVAILABLE',
      status: 403,
    });
    expect(isMarked).toHaveBeenCalledWith(HASHED);
    expect(record).toHaveBeenCalledWith(
      SecurityEventAction.SIGNUP_REFUSED_BANNED_DEVICE,
      expect.objectContaining({ code: 'SIGNUP_UNAVAILABLE' }),
    );
    expect(evaluateDomain).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });

  it('checks the bot challenge BEFORE the device, so a script cannot probe devices for free', async () => {
    isMarked.mockResolvedValue(true);
    evaluateBot.mockResolvedValue({
      outcome: BotCheckOutcome.REQUIRED,
      reason: BotCheckReason.POW_MISSING,
    });
    await expect(service.screen(INPUT, ORIGIN)).rejects.toMatchObject({
      code: 'BOT_CHECK_REQUIRED',
    });
    expect(isMarked).not.toHaveBeenCalled();
  });

  it('runs every check and returns the device and the trial decision', async () => {
    await expect(service.screen(INPUT, ORIGIN)).resolves.toEqual({
      device: HASHED,
      trial: { grant: true, reason: TrialDecisionReason.GRANTED },
    });
    expect(evaluateBot).toHaveBeenCalledWith(INPUT.botCheck, BotCheckAction.REGISTER, ORIGIN.ip);
    expect(consume).toHaveBeenCalledWith(HASHED);
    expect(deviceTrust.decideTrial).toHaveBeenCalledWith(HASHED, '203.0.113.0/24');
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a missing bot check with 428 and a security event, before anything else', async () => {
    evaluateBot.mockResolvedValue({
      outcome: BotCheckOutcome.REQUIRED,
      reason: BotCheckReason.POW_MISSING,
    });

    await expect(service.screen(INPUT, ORIGIN)).rejects.toMatchObject({
      code: 'BOT_CHECK_REQUIRED',
      status: 428,
    });
    expect(evaluateDomain).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(SecurityEventAction.SIGNUP_REFUSED_BOT_CHECK, {
      origin: ORIGIN,
      email: INPUT.email,
      fingerprintHash: HASHED.fingerprintHash,
      code: 'BOT_CHECK_REQUIRED',
      reason: BotCheckReason.POW_MISSING,
    });
  });

  it('refuses a failed bot check with 403', async () => {
    evaluateBot.mockResolvedValue({
      outcome: BotCheckOutcome.FAILED,
      reason: BotCheckReason.POW_REUSED,
    });
    await expect(service.screen(INPUT, ORIGIN)).rejects.toMatchObject({
      code: 'BOT_CHECK_FAILED',
      status: 403,
    });
  });

  it.each([
    [EmailDomainVerdict.DISPOSABLE, 'DISPOSABLE_EMAIL'],
    [EmailDomainVerdict.UNDELIVERABLE, 'EMAIL_DOMAIN_UNDELIVERABLE'],
  ])('refuses a %s domain with %s on the email field', async (verdict, code) => {
    evaluateDomain.mockResolvedValue(verdict);
    const error = await service.screen(INPUT, ORIGIN).catch((e: unknown) => e);
    expect(error).toMatchObject({ code, status: 400 });
    expect(consume).not.toHaveBeenCalled();
    expect(record).toHaveBeenCalledWith(
      SecurityEventAction.SIGNUP_REFUSED_DISPOSABLE,
      expect.objectContaining({ code, reason: verdict }),
    );
  });

  it('refuses a velocity breach with 429 and its wait', async () => {
    consume.mockResolvedValue({ allowed: false, retryAfterSeconds: 321 });
    const error = await service.screen(INPUT, ORIGIN).catch((e: unknown) => e);
    expect(error).toMatchObject({ code: 'SIGNUP_TEMPORARILY_LIMITED', status: 429 });
    expect((error as { getResponse: () => unknown }).getResponse()).toMatchObject({
      details: { retryAfterSeconds: 321 },
    });
    expect(record).toHaveBeenCalledWith(
      SecurityEventAction.SIGNUP_VELOCITY_LIMITED,
      expect.objectContaining({ code: 'SIGNUP_TEMPORARILY_LIMITED' }),
    );
    expect(deviceTrust.decideTrial).not.toHaveBeenCalled();
  });

  it('screens an old client without a device: no device, trial decided as missing', async () => {
    deviceTrust.hash.mockReturnValue(null);
    deviceTrust.decideTrial.mockResolvedValue({
      grant: false,
      reason: TrialDecisionReason.MISSING_DEVICE,
    });
    const verdict = await service.screen({ ...INPUT, device: undefined }, ORIGIN);
    expect(verdict.device).toBeNull();
    expect(consume).toHaveBeenCalledWith(null);
  });

  describe('recordSignup', () => {
    it('records the device and logs nothing when the trial was granted', async () => {
      await service.recordSignup(
        'u1',
        INPUT.email,
        {
          device: HASHED,
          trial: { grant: true, reason: TrialDecisionReason.GRANTED },
        },
        ORIGIN,
      );
      expect(deviceTrust.record).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'u1', device: HASHED, origin: ORIGIN }),
      );
      expect(record).not.toHaveBeenCalled();
    });

    it('logs trial_denied_shared_device with the reason when the trial was refused', async () => {
      await service.recordSignup(
        'u2',
        INPUT.email,
        {
          device: HASHED,
          trial: { grant: false, reason: TrialDecisionReason.SHARED_DEVICE },
        },
        ORIGIN,
      );
      expect(record).toHaveBeenCalledWith(SecurityEventAction.TRIAL_DENIED_SHARED_DEVICE, {
        origin: ORIGIN,
        email: INPUT.email,
        fingerprintHash: HASHED.fingerprintHash,
        reason: TrialDecisionReason.SHARED_DEVICE,
        userId: 'u2',
      });
    });

    it('records no device row for a sign-up without a device', async () => {
      await service.recordSignup(
        'u3',
        INPUT.email,
        {
          device: null,
          trial: { grant: false, reason: TrialDecisionReason.MISSING_DEVICE },
        },
        ORIGIN,
      );
      expect(deviceTrust.record).not.toHaveBeenCalled();
      expect(record).toHaveBeenCalledTimes(1);
    });
  });
});
