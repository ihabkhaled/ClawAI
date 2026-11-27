import { type Mock, vi } from 'vitest';
import { Logger } from '@nestjs/common';

import { AppConfig } from '../../../../app/config/app.config';
import { TrialDecisionReason } from '../../enums/trial-decision-reason.enum';
import { type UserDeviceRepository } from '../../repositories/user-device.repository';
import { DeviceTrustService } from '../device-trust.service';

const NOW = new Date('2026-11-27T10:00:00.000Z');
const DEVICE = { fingerprintHash: 'f'.repeat(64), deviceIdHash: 'd'.repeat(64) };

describe('DeviceTrustService', () => {
  let devices: { countTrialsSharingDevice: Mock; countNetworkTrialsSince: Mock; upsert: Mock };
  let service: DeviceTrustService;

  beforeEach(() => {
    vi.spyOn(AppConfig, 'get').mockReturnValue({
      ENCRYPTION_KEY: 'a'.repeat(64),
    } as ReturnType<typeof AppConfig.get>);
    devices = {
      countTrialsSharingDevice: vi.fn().mockResolvedValue(0),
      countNetworkTrialsSince: vi.fn().mockResolvedValue(0),
      upsert: vi.fn().mockResolvedValue(undefined),
    };
    service = new DeviceTrustService(devices as unknown as UserDeviceRepository);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('grants the trial to a new device on a quiet network', async () => {
    await expect(service.decideTrial(DEVICE, '203.0.113.0/24', NOW)).resolves.toEqual({
      grant: true,
      reason: TrialDecisionReason.GRANTED,
    });
    expect(devices.countNetworkTrialsSince).toHaveBeenCalledWith(
      '203.0.113.0/24',
      new Date('2026-11-26T10:00:00.000Z'),
    );
  });

  it('denies the trial without a device object (old client or API script)', async () => {
    await expect(service.decideTrial(null, '203.0.113.0/24', NOW)).resolves.toEqual({
      grant: false,
      reason: TrialDecisionReason.MISSING_DEVICE,
    });
    expect(devices.countTrialsSharingDevice).not.toHaveBeenCalled();
  });

  it('denies the trial when another account on this fingerprint or device id had one', async () => {
    devices.countTrialsSharingDevice.mockResolvedValue(1);
    await expect(service.decideTrial(DEVICE, null, NOW)).resolves.toEqual({
      grant: false,
      reason: TrialDecisionReason.SHARED_DEVICE,
    });
    expect(devices.countTrialsSharingDevice).toHaveBeenCalledWith(DEVICE);
  });

  it('denies the trial once the /24 produced 3 trials in 24 h, not before', async () => {
    devices.countNetworkTrialsSince.mockResolvedValue(2);
    await expect(service.decideTrial(DEVICE, '198.51.100.0/24', NOW)).resolves.toMatchObject({
      grant: true,
    });
    devices.countNetworkTrialsSince.mockResolvedValue(3);
    await expect(service.decideTrial(DEVICE, '198.51.100.0/24', NOW)).resolves.toEqual({
      grant: false,
      reason: TrialDecisionReason.SHARED_NETWORK,
    });
  });

  it('skips the network rule when the address is unknown', async () => {
    await service.decideTrial(DEVICE, null, NOW);
    expect(devices.countNetworkTrialsSince).not.toHaveBeenCalled();
  });

  it('hashes with a pepper derived from ENCRYPTION_KEY, deterministically', () => {
    const raw = { fingerprint: 'c'.repeat(64), deviceId: 'device-0001' };
    const first = service.hash(raw);
    expect(first).toEqual(service.hash(raw));
    expect(first?.fingerprintHash).not.toBe('c'.repeat(64));
    expect(service.hash(undefined)).toBeNull();
  });

  it('records a device and never throws when the write fails', async () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    const input = {
      userId: 'u1',
      device: DEVICE,
      origin: { ip: null, countryCode: null, userAgent: null },
      seenAt: NOW,
    };
    await service.record(input);
    expect(devices.upsert).toHaveBeenCalledWith(input);
    devices.upsert.mockRejectedValue(new Error('db down'));
    await expect(service.record(input)).resolves.toBeUndefined();
  });
});
