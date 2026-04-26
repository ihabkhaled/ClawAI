import { Test, type TestingModule } from '@nestjs/testing';
import { ConnectorsRepository } from '../connectors.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('ConnectorsRepository', () => {
  let repository: ConnectorsRepository;
  let prismaMock: {
    connector: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      connector: {
        create: jest.fn().mockResolvedValue({ id: 'c1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'c1' }),
        findFirst: jest.fn().mockResolvedValue({ id: 'c1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'c1' }]),
        update: jest.fn().mockResolvedValue({ id: 'c1' }),
        delete: jest.fn().mockResolvedValue({ id: 'c1' }),
        count: jest.fn().mockResolvedValue(2),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ConnectorsRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<ConnectorsRepository>(ConnectorsRepository);
  });

  it('create persists via prisma', async () => {
    await repository.create({ name: 'OpenAI', provider: 'OPENAI' } as never);
    expect(prismaMock.connector.create).toHaveBeenCalled();
  });

  it('findById uses prisma findUnique', async () => {
    await repository.findById('c1');
    expect(prismaMock.connector.findUnique).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  describe('findAll', () => {
    it('paginates with skip/take and includes _count.models', async () => {
      await repository.findAll({} as never, 2, 10);
      const args = prismaMock.connector.findMany.mock.calls[0][0];
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.include._count.select.models).toBe(true);
    });

    it('orders by createdAt desc', async () => {
      await repository.findAll({} as never, 1, 20);
      const args = prismaMock.connector.findMany.mock.calls[0][0];
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('applies provider/status/isEnabled filters', async () => {
      await repository.findAll(
        {
          provider: 'OPENAI',
          status: 'ACTIVE',
          isEnabled: true,
        } as never,
        1,
        20,
      );
      const args = prismaMock.connector.findMany.mock.calls[0][0];
      expect(args.where.provider).toBe('OPENAI');
      expect(args.where.status).toBe('ACTIVE');
      expect(args.where.isEnabled).toBe(true);
    });

    it('applies search filter', async () => {
      await repository.findAll({ search: 'open' } as never, 1, 20);
      const args = prismaMock.connector.findMany.mock.calls[0][0];
      expect(args.where.name).toEqual({ contains: 'open', mode: 'insensitive' });
    });
  });

  it('update delegates to prisma', async () => {
    await repository.update('c1', { name: 'Renamed' } as never);
    expect(prismaMock.connector.update).toHaveBeenCalledWith({
      where: { id: 'c1' },
      data: { name: 'Renamed' },
    });
  });

  it('findByProvider finds the most recent enabled connector for the provider', async () => {
    await repository.findByProvider('OPENAI');
    const args = prismaMock.connector.findFirst.mock.calls[0][0];
    expect(args.where.isEnabled).toBe(true);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('delete delegates to prisma', async () => {
    await repository.delete('c1');
    expect(prismaMock.connector.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
  });

  it('countAll returns count from prisma', async () => {
    const result = await repository.countAll({} as never);
    expect(result).toBe(2);
  });
});
