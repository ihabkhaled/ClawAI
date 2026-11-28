import { vi } from 'vitest';

import { type PrismaService } from '../../../infrastructure/database/prisma/prisma.service';
import { AbuseSignalCode } from '../enums/abuse-signal-code.enum';
import { BannedDeviceHashKind } from '../enums/banned-device-hash-kind.enum';
import { DeviceMarkReason } from '../enums/device-mark-reason.enum';
import { AbuseSignalRepository } from '../repositories/abuse-signal.repository';
import { AbuseSuspensionRepository } from '../repositories/abuse-suspension.repository';
import { BannedDeviceRepository } from '../repositories/banned-device.repository';

const NOW = new Date('2026-11-28T10:00:00.000Z');

describe('AbuseSuspensionRepository', () => {
  it('writes the ban columns and the audit row in ONE transaction, with no admin actor', async () => {
    const userUpdate = vi.fn().mockReturnValue('user-op');
    const create = vi.fn().mockReturnValue('audit-op');
    const transaction = vi.fn().mockResolvedValue([{}, { id: 'suspension-1' }]);
    const repository = new AbuseSuspensionRepository({
      user: { update: userUpdate },
      abuseSuspension: { create },
      $transaction: transaction,
    } as unknown as PrismaService);
    const endsAt = new Date(NOW.getTime() + 3_600_000);

    await expect(
      repository.apply({
        userId: 'user-1',
        level: 1,
        reasonCode: AbuseSignalCode.RATE_LIMIT_TRIPPED,
        evidence: { [AbuseSignalCode.RATE_LIMIT_TRIPPED]: 312 },
        startedAt: NOW,
        endsAt,
        banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED',
      }),
    ).resolves.toEqual({ id: 'suspension-1' });

    expect(transaction).toHaveBeenCalledWith(['user-op', 'audit-op']);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        bannedAt: NOW,
        bannedUntil: endsAt,
        banReason: 'AUTO_ABUSE:RATE_LIMIT_TRIPPED',
        bannedByUserId: null,
      },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'user-1', level: 1, startedAt: NOW, endsAt }),
    });
  });

  it('counts only suspensions inside the window that nobody lifted', async () => {
    const count = vi.fn().mockResolvedValue(2);
    const repository = new AbuseSuspensionRepository({
      abuseSuspension: { count },
    } as unknown as PrismaService);
    const since = new Date('2026-10-29T10:00:00.000Z');
    await expect(repository.countLiveSince('user-1', since)).resolves.toBe(2);
    expect(count).toHaveBeenCalledWith({
      where: { userId: 'user-1', startedAt: { gte: since }, liftedAt: null },
    });
  });

  it('lifts only what is still running, naming the administrator', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const repository = new AbuseSuspensionRepository({
      abuseSuspension: { updateMany },
    } as unknown as PrismaService);
    await expect(repository.liftActive('user-1', 'admin-1', NOW)).resolves.toBe(1);
    expect(updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', liftedAt: null, endsAt: { gt: NOW } },
      data: { liftedAt: NOW, liftedByUserId: 'admin-1' },
    });
  });
});

describe('BannedDeviceRepository', () => {
  it('marks idempotently and re-activates a mark an administrator lifted before', async () => {
    const createMany = vi.fn().mockReturnValue('create-op');
    const updateMany = vi.fn().mockReturnValue('reactivate-op');
    const transaction = vi.fn().mockResolvedValue([]);
    const repository = new BannedDeviceRepository({
      bannedDeviceMark: { createMany, updateMany },
      $transaction: transaction,
    } as unknown as PrismaService);

    await repository.markMany([
      {
        kind: BannedDeviceHashKind.FINGERPRINT,
        value: 'fp-1',
        sourceUserId: 'user-9',
        reason: DeviceMarkReason.ADMIN_LIFETIME_BAN,
      },
    ]);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        {
          hashKind: 'FINGERPRINT',
          hashValue: 'fp-1',
          sourceUserId: 'user-9',
          reasonCode: 'ADMIN_LIFETIME_BAN',
        },
      ],
      skipDuplicates: true,
    });
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        liftedAt: { not: null },
        OR: [{ hashKind: 'FINGERPRINT', hashValue: 'fp-1', sourceUserId: 'user-9' }],
      },
      data: { liftedAt: null },
    });
    expect(transaction).toHaveBeenCalledWith(['create-op', 'reactivate-op']);
  });

  it('writes nothing for an empty list', async () => {
    const transaction = vi.fn();
    await new BannedDeviceRepository({
      $transaction: transaction,
    } as unknown as PrismaService).markMany([]);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('matches either hash of a device, among ACTIVE marks only', async () => {
    const count = vi.fn().mockResolvedValue(1);
    const repository = new BannedDeviceRepository({
      bannedDeviceMark: { count },
    } as unknown as PrismaService);
    await repository.countActiveFor({ fingerprintHash: 'fp', deviceIdHash: 'did' });
    expect(count).toHaveBeenCalledWith({
      where: {
        liftedAt: null,
        OR: [
          { hashKind: 'FINGERPRINT', hashValue: 'fp' },
          { hashKind: 'DEVICE_ID', hashValue: 'did' },
        ],
      },
    });
  });

  it('can ignore the marks one account itself caused', async () => {
    const count = vi.fn().mockResolvedValue(0);
    const repository = new BannedDeviceRepository({
      bannedDeviceMark: { count },
    } as unknown as PrismaService);
    await repository.countActiveFor({ fingerprintHash: 'fp', deviceIdHash: 'did' }, 'user-9');
    expect(count.mock.calls[0]?.[0]).toMatchObject({
      where: { liftedAt: null, sourceUserId: { not: 'user-9' } },
    });
  });

  it('lifts the marks of one source account that are still active', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 3 });
    const repository = new BannedDeviceRepository({
      bannedDeviceMark: { updateMany },
    } as unknown as PrismaService);
    await expect(repository.liftBySource('user-9', NOW)).resolves.toBe(3);
    expect(updateMany).toHaveBeenCalledWith({
      where: { sourceUserId: 'user-9', liftedAt: null },
      data: { liftedAt: NOW },
    });
  });
});

describe('AbuseSignalRepository', () => {
  it('SETS the bucket count (a snapshot of the Redis window), keyed on account, code and minute', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const repository = new AbuseSignalRepository({
      abuseSignal: { upsert },
    } as unknown as PrismaService);
    await repository.upsertBucket({
      userId: 'user-1',
      code: AbuseSignalCode.FORBIDDEN_PROBE,
      source: 'auth.http',
      count: 7,
      counted: true,
      bucketStart: NOW,
    });
    expect(upsert).toHaveBeenCalledWith({
      where: {
        userId_code_bucketStart: { userId: 'user-1', code: 'FORBIDDEN_PROBE', bucketStart: NOW },
      },
      create: {
        userId: 'user-1',
        code: 'FORBIDDEN_PROBE',
        source: 'auth.http',
        count: 7,
        counted: true,
        bucketStart: NOW,
      },
      update: { count: 7, source: 'auth.http' },
    });
  });

  it('totals one code for an account, 0 when there is none', async () => {
    const aggregate = vi
      .fn()
      .mockResolvedValueOnce({ _sum: { count: 12 } })
      .mockResolvedValueOnce({ _sum: { count: null } });
    const repository = new AbuseSignalRepository({
      abuseSignal: { aggregate },
    } as unknown as PrismaService);
    await expect(repository.totalFor('user-1', AbuseSignalCode.TOKEN_REUSE)).resolves.toBe(12);
    await expect(repository.totalFor('user-1', AbuseSignalCode.TOKEN_REUSE)).resolves.toBe(0);
  });

  it('lists the newest buckets first, bounded', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repository = new AbuseSignalRepository({
      abuseSignal: { findMany },
    } as unknown as PrismaService);
    await repository.listRecent('user-1');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { bucketStart: 'desc' },
        take: 50,
      }),
    );
  });
});
