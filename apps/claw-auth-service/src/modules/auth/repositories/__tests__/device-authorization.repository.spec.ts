import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { DeviceAuthorizationRepository } from '../device-authorization.repository';

describe('DeviceAuthorizationRepository', () => {
  let repository: DeviceAuthorizationRepository;
  let prisma: {
    deviceAuthorizationGrant: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      deviceAuthorizationGrant: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({ intervalSeconds: 10 }),
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
