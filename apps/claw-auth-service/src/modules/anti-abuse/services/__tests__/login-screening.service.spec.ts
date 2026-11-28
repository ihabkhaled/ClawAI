import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { BotCheckAction } from '../../enums/bot-check-action.enum';
import { BotCheckOutcome } from '../../enums/bot-check-outcome.enum';
import { BotCheckReason } from '../../enums/bot-check-reason.enum';
import { SecurityEventAction } from '../../enums/security-event-action.enum';
import { type AntiAbuseCounterRepository } from '../../repositories/anti-abuse-counter.repository';
import { loginFailureEmailKey, loginFailureIpKey } from '../../utilities/anti-abuse-key.utility';
import { type BotCheckService } from '../bot-check.service';
import { AbuseSignalCode } from '../../../abuse-defense/enums/abuse-signal-code.enum';
import { type AbuseSignalService } from '../../../abuse-defense/services/abuse-signal.service';
import { type BannedDeviceService } from '../../../abuse-defense/services/banned-device.service';
import { type DeviceTrustService } from '../device-trust.service';
import { LoginScreeningService } from '../login-screening.service';
import { type SecurityEventService } from '../security-event.service';

const ORIGIN = { ip: '198.51.100.4', countryCode: 'US', userAgent: 'Mozilla/5.0' };
const EMAIL = 'someone@example.com';
const EMAIL_KEY = loginFailureEmailKey(EMAIL);
const IP_KEY = loginFailureIpKey(ORIGIN.ip) ?? '';
const HASHED = { fingerprintHash: 'f'.repeat(64), deviceIdHash: 'd'.repeat(64) };

describe('LoginScreeningService', () => {
  let counts: Map<string, number>;
  let counters: { read: Mock; hit: Mock; reset: Mock };
  let evaluate: Mock;
  let deviceTrust: { hash: Mock; record: Mock };
  let record: Mock;
  let isMarked: Mock;
  let abuseRecord: Mock;
  let service: LoginScreeningService;

  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    counts = new Map();
    counters = {
      read: vi.fn(async (key: string) => Promise.resolve(counts.get(key) ?? 0)),
      hit: vi.fn().mockResolvedValue({ count: 1, ttlSeconds: 900 }),
      reset: vi.fn().mockResolvedValue(undefined),
    };
    evaluate = vi.fn().mockResolvedValue({
      outcome: BotCheckOutcome.REQUIRED,
      reason: BotCheckReason.POW_MISSING,
    });
    deviceTrust = { hash: vi.fn().mockReturnValue(HASHED), record: vi.fn() };
    record = vi.fn();
    isMarked = vi.fn().mockResolvedValue(false);
    abuseRecord = vi.fn().mockResolvedValue(undefined);
    service = new LoginScreeningService(
      { evaluate } as unknown as BotCheckService,
      counters as unknown as AntiAbuseCounterRepository,
      deviceTrust as unknown as DeviceTrustService,
      { record } as unknown as SecurityEventService,
      { isMarked } as unknown as BannedDeviceService,
      { record: abuseRecord } as unknown as AbuseSignalService,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('asks for nothing below 5 failures', async () => {
    counts.set(EMAIL_KEY, 4);
    counts.set(IP_KEY, 4);
    await expect(service.assertAllowed(EMAIL, {}, ORIGIN)).resolves.toBeUndefined();
    expect(evaluate).not.toHaveBeenCalled();
  });

  it.each([
    ['the address', EMAIL_KEY],
    ['the IP', IP_KEY],
  ])('requires the checks after 5 failures for %s (428 + security event)', async (_n, key) => {
    counts.set(key, 5);
    await expect(service.assertAllowed(EMAIL, {}, ORIGIN)).rejects.toMatchObject({
      code: 'BOT_CHECK_REQUIRED',
      status: 428,
    });
    expect(evaluate).toHaveBeenCalledWith(undefined, BotCheckAction.LOGIN, ORIGIN.ip);
    expect(record).toHaveBeenCalledWith(SecurityEventAction.LOGIN_BOT_CHECK_REQUIRED, {
      origin: ORIGIN,
      email: EMAIL,
      fingerprintHash: HASHED.fingerprintHash,
      code: 'BOT_CHECK_REQUIRED',
      reason: BotCheckReason.POW_MISSING,
    });
  });

  it('refuses a failed check with 403', async () => {
    counts.set(EMAIL_KEY, 6);
    evaluate.mockResolvedValue({
      outcome: BotCheckOutcome.FAILED,
      reason: BotCheckReason.POW_EXPIRED,
    });
    await expect(service.assertAllowed(EMAIL, {}, ORIGIN)).rejects.toMatchObject({
      code: 'BOT_CHECK_FAILED',
    });
  });

  it('lets a passed check through', async () => {
    counts.set(IP_KEY, 9);
    evaluate.mockResolvedValue({ outcome: BotCheckOutcome.PASSED, reason: BotCheckReason.PASSED });
    const botCheck = { pow: { token: 't.s', nonce: '3' } };
    await expect(service.assertAllowed(EMAIL, { botCheck }, ORIGIN)).resolves.toBeUndefined();
    expect(evaluate).toHaveBeenCalledWith(botCheck, BotCheckAction.LOGIN, ORIGIN.ip);
  });

  it('requires nothing when Redis cannot answer (fail open)', async () => {
    counters.read.mockResolvedValue(null);
    await expect(service.assertAllowed(EMAIL, {}, ORIGIN)).resolves.toBeUndefined();
  });

  it('counts a failure per address and per IP for 15 minutes', async () => {
    await service.recordFailure(EMAIL, ORIGIN);
    expect(counters.hit).toHaveBeenCalledWith(EMAIL_KEY, 900);
    expect(counters.hit).toHaveBeenCalledWith(IP_KEY, 900);
    counters.hit.mockClear();
    await service.recordFailure(EMAIL, { ...ORIGIN, ip: null });
    expect(counters.hit).toHaveBeenCalledTimes(1);
  });

  it('forgets the address failures and records the device on success', async () => {
    const device = { fingerprint: 'a'.repeat(64), deviceId: 'device-0001' };
    await service.recordSuccess('u1', EMAIL, { device }, ORIGIN);
    expect(counters.reset).toHaveBeenCalledWith(EMAIL_KEY);
    expect(deviceTrust.hash).toHaveBeenCalledWith(device);
    expect(deviceTrust.record).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', device: HASHED, origin: ORIGIN }),
    );
  });

  it('flags, and never blocks, an existing account that signs in on a banned device', async () => {
    isMarked.mockResolvedValue(true);
    const device = { fingerprint: 'a'.repeat(64), deviceId: 'device-0001' };
    await expect(service.recordSuccess('u1', EMAIL, { device }, ORIGIN)).resolves.toBeUndefined();
    expect(isMarked).toHaveBeenCalledWith(HASHED, 'u1');
    expect(record).toHaveBeenCalledWith(
      SecurityEventAction.LOGIN_ON_BANNED_DEVICE,
      expect.objectContaining({ userId: 'u1', fingerprintHash: HASHED.fingerprintHash }),
    );
    expect(abuseRecord).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', code: AbuseSignalCode.BANNED_DEVICE_SIGNIN }),
    );
  });

  it('flags nothing on a device no banned account used', async () => {
    const device = { fingerprint: 'a'.repeat(64), deviceId: 'device-0001' };
    await service.recordSuccess('u1', EMAIL, { device }, ORIGIN);
    expect(abuseRecord).not.toHaveBeenCalled();
    expect(record).not.toHaveBeenCalled();
  });

  it('never fails a sign-in because the banned-device lookup failed', async () => {
    isMarked.mockRejectedValue(new Error('database down'));
    const device = { fingerprint: 'a'.repeat(64), deviceId: 'device-0001' };
    await expect(service.recordSuccess('u1', EMAIL, { device }, ORIGIN)).resolves.toBeUndefined();
    expect(abuseRecord).not.toHaveBeenCalled();
  });

  it('records no device on a success without one', async () => {
    deviceTrust.hash.mockReturnValue(null);
    await service.recordSuccess('u1', EMAIL, {}, ORIGIN);
    expect(deviceTrust.record).not.toHaveBeenCalled();
  });
});
