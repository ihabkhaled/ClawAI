import { type Mock, vi } from 'vitest';

import { type AntiAbuseCounterRepository } from '../../repositories/anti-abuse-counter.repository';
import { type SecuritySettingsService } from '../security-settings.service';
import { SignupVelocityService } from '../signup-velocity.service';

const DEVICE = { fingerprintHash: 'f'.repeat(64), deviceIdHash: 'd'.repeat(64) };

describe('SignupVelocityService', () => {
  let counts: Map<string, number>;
  let hit: Mock;
  let service: SignupVelocityService;

  beforeEach(() => {
    counts = new Map();
    hit = vi.fn(async (key: string, windowSeconds: number) => {
      const count = (counts.get(key) ?? 0) + 1;
      counts.set(key, count);
      return Promise.resolve({ count, ttlSeconds: windowSeconds - 10 });
    });
    service = new SignupVelocityService(
      {
        resolve: vi.fn().mockResolvedValue({ signupMaxPer10Min: 30, signupMaxPerDevicePerDay: 3 }),
      } as unknown as SecuritySettingsService,
      { hit } as unknown as AntiAbuseCounterRepository,
    );
  });

  it('allows sign-ups under both limits and counts the device and the platform', async () => {
    await expect(service.consume(DEVICE)).resolves.toEqual({ allowed: true });
    expect(hit).toHaveBeenCalledWith(`auth:abuse:signup:fp:${DEVICE.fingerprintHash}`, 86_400);
    expect(hit).toHaveBeenCalledWith(`auth:abuse:signup:did:${DEVICE.deviceIdHash}`, 86_400);
    expect(hit).toHaveBeenCalledWith('auth:abuse:signup:global', 600);
  });

  it('limits the 4th sign-up from one device in 24 h, without spending the platform budget', async () => {
    for (let i = 0; i < 3; i += 1) {
      await service.consume(DEVICE);
    }
    await expect(service.consume(DEVICE)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 86_390,
    });
    expect(counts.get('auth:abuse:signup:global')).toBe(3);
  });

  it('limits one shared device id even under a new fingerprint', async () => {
    counts.set(`auth:abuse:signup:did:${DEVICE.deviceIdHash}`, 3);
    await expect(
      service.consume({ ...DEVICE, fingerprintHash: 'e'.repeat(64) }),
    ).resolves.toMatchObject({ allowed: false });
  });

  it('limits the 31st sign-up in 10 minutes across the platform', async () => {
    counts.set('auth:abuse:signup:global', 30);
    await expect(service.consume(null)).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 590,
    });
  });

  it('counts only the platform window when there is no device', async () => {
    await service.consume(null);
    expect(hit).toHaveBeenCalledTimes(1);
  });

  it('allows the sign-up when Redis cannot answer (fail open)', async () => {
    hit.mockResolvedValue(null);
    await expect(service.consume(DEVICE)).resolves.toEqual({ allowed: true });
  });
});
