import { type Mock, vi } from 'vitest';

import { type PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { UserDeviceRepository } from '../user-device.repository';

const DEVICE = { fingerprintHash: 'f'.repeat(64), deviceIdHash: 'd'.repeat(64) };
const SEEN = new Date('2026-11-27T10:00:00.000Z');

describe('UserDeviceRepository', () => {
  let prisma: {
    userDevice: { upsert: Mock; findMany: Mock };
    planTrialRedemption: { count: Mock };
    user: { findUnique: Mock; findMany: Mock };
  };
  let repository: UserDeviceRepository;

  beforeEach(() => {
    prisma = {
      userDevice: { upsert: vi.fn(), findMany: vi.fn().mockResolvedValue([{ userId: 'u2' }]) },
      planTrialRedemption: { count: vi.fn().mockResolvedValue(1) },
      user: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([{ id: 'u3' }]) },
    };
    repository = new UserDeviceRepository(prisma as unknown as PrismaService);
  });

  it('upserts one row per (user, fingerprint) and keeps the first-seen columns', async () => {
    await repository.upsert({
      userId: 'u1',
      device: DEVICE,
      origin: { ip: '203.0.113.9', countryCode: 'NL', userAgent: 'UA' },
      seenAt: SEEN,
    });
    const args = prisma.userDevice.upsert.mock.calls[0]?.[0];
    expect(args.where).toEqual({
      userId_fingerprintHash: { userId: 'u1', fingerprintHash: DEVICE.fingerprintHash },
    });
    expect(args.create).toMatchObject({ firstIp: '203.0.113.9', lastIp: '203.0.113.9' });
    expect(args.update).not.toHaveProperty('firstIp');
    expect(args.update).not.toHaveProperty('firstSeenAt');
    expect(args.update).toMatchObject({ lastIp: '203.0.113.9', lastSeenAt: SEEN });
  });

  it('counts trials of any account seen on the fingerprint OR the device id', async () => {
    await expect(repository.countTrialsSharingDevice(DEVICE)).resolves.toBe(1);
    expect(prisma.planTrialRedemption.count).toHaveBeenCalledWith({
      where: {
        user: {
          devices: {
            some: {
              OR: [
                { fingerprintHash: DEVICE.fingerprintHash },
                { deviceIdHash: DEVICE.deviceIdHash },
              ],
            },
          },
        },
      },
    });
  });

  it('counts trials started since a date by accounts of one network', async () => {
    await repository.countNetworkTrialsSince('203.0.113.0/24', SEEN);
    expect(prisma.planTrialRedemption.count).toHaveBeenCalledWith({
      where: { startedAt: { gte: SEEN }, user: { registrationNetwork: '203.0.113.0/24' } },
    });
  });

  it('reads the linking signals, or null for an unknown account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      registrationNetwork: '203.0.113.0/24',
      devices: [{ fingerprintHash: 'f1', deviceIdHash: 'd1' }],
    });
    await expect(repository.findLinkingSignals('u1')).resolves.toEqual({
      fingerprintHashes: ['f1'],
      deviceIdHashes: ['d1'],
      registrationNetwork: '203.0.113.0/24',
    });
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(repository.findLinkingSignals('nobody')).resolves.toBeNull();
  });

  it('finds other accounts by fingerprint, device id and network, bounded', async () => {
    await expect(repository.findUserIdsByFingerprints(['f1'], 'u1')).resolves.toEqual(['u2']);
    expect(prisma.userDevice.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { fingerprintHash: { in: ['f1'] }, userId: { not: 'u1' } },
      distinct: ['userId'],
      take: 100,
    });
    await repository.findUserIdsByDeviceIds(['d1'], 'u1');
    expect(prisma.userDevice.findMany.mock.calls[1]?.[0].where).toEqual({
      deviceIdHash: { in: ['d1'] },
      userId: { not: 'u1' },
    });
    await expect(repository.findUserIdsByNetwork('203.0.113.0/24', 'u1')).resolves.toEqual(['u3']);
    expect(prisma.user.findMany.mock.calls[0]?.[0]).toMatchObject({
      where: { registrationNetwork: '203.0.113.0/24', id: { not: 'u1' } },
      take: 100,
    });
  });

  it('reads only the columns the admin view shows', async () => {
    await repository.findUsersByIds(['u2']);
    expect(prisma.user.findMany.mock.calls[0]?.[0].select).toEqual({
      id: true,
      email: true,
      status: true,
      bannedAt: true,
      createdAt: true,
    });
  });
});
