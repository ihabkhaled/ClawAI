import { vi, type Mock } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { DeviceAuthorizationRepository } from '../device-authorization.repository';

describe('DeviceAuthorizationRepository', () => {
  let repository: DeviceAuthorizationRepository;
  let prisma: {
    deviceAuthorizationGrant: {
      create: Mock;
      findUnique: Mock;
      updateMany: Mock;
      update: Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      deviceAuthorizationGrant: {
        create: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        update: vi.fn().mockResolvedValue({ intervalSeconds: 10 }),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeviceAuthorizationRepository, { provide: PrismaService, useValue: prisma }],
    }).compile();
    repository = module.get(DeviceAuthorizationRepository);
  });

  it('consumes only an approved, unexpired, unconsumed grant', async () => {
    const now = new Date('2026-07-27T00:00:00.000Z');

    await repository.consume('grant-1', now);

    expect(prisma.deviceAuthorizationGrant.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'grant-1',
        status: 'APPROVED',
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: {
        status: 'CONSUMED',
        consumedAt: now,
      },
    });
  });
});
