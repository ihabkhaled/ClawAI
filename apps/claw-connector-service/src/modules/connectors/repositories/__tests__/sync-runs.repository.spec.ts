import { Test, type TestingModule } from '@nestjs/testing';
import { SyncRunsRepository } from '../sync-runs.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('SyncRunsRepository', () => {
  let repository: SyncRunsRepository;
  let prismaMock: {
    modelSyncRun: { create: jest.Mock; update: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      modelSyncRun: {
        create: jest.fn().mockResolvedValue({ id: 's1' }),
        update: jest.fn().mockResolvedValue({ id: 's1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 's1' }]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [SyncRunsRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    repository = module.get<SyncRunsRepository>(SyncRunsRepository);
  });

  it('create persists via prisma', async () => {
    await repository.create({ connectorId: 'c1', startedAt: new Date() } as never);
    expect(prismaMock.modelSyncRun.create).toHaveBeenCalled();
  });

  it('update merges completedAt and partial data', async () => {
    const completedAt = new Date('2026-04-26T20:00:00Z');
    await repository.update('s1', { completedAt, modelsAdded: 3 } as never);
    expect(prismaMock.modelSyncRun.update).toHaveBeenCalledWith({
      where: { id: 's1' },
      data: { completedAt, modelsAdded: 3 },
    });
  });

  it('findByConnectorId orders by startedAt desc with limit', async () => {
    await repository.findByConnectorId('c1', 5);
    expect(prismaMock.modelSyncRun.findMany).toHaveBeenCalledWith({
      where: { connectorId: 'c1' },
      orderBy: { startedAt: 'desc' },
      take: 5,
    });
  });
});
