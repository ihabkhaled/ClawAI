import { Test, type TestingModule } from '@nestjs/testing';
import { HealthEventsRepository } from '../health-events.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('HealthEventsRepository', () => {
  let repository: HealthEventsRepository;
  let prismaMock: {
    connectorHealthEvent: { create: jest.Mock; findMany: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      connectorHealthEvent: {
        create: jest.fn().mockResolvedValue({ id: 'h1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'h1' }]),
      },
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthEventsRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    repository = module.get<HealthEventsRepository>(HealthEventsRepository);
  });

  it('create persists via prisma', async () => {
    await repository.create({ connectorId: 'c1', isHealthy: true, latencyMs: 50 } as never);
    expect(prismaMock.connectorHealthEvent.create).toHaveBeenCalled();
  });

  it('findByConnectorId orders by checkedAt desc with limit', async () => {
    await repository.findByConnectorId('c1', 10);
    expect(prismaMock.connectorHealthEvent.findMany).toHaveBeenCalledWith({
      where: { connectorId: 'c1' },
      orderBy: { checkedAt: 'desc' },
      take: 10,
    });
  });
});
