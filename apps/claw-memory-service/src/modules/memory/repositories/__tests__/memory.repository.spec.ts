import { Test, type TestingModule } from '@nestjs/testing';
import { MemoryRepository } from '../memory.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('MemoryRepository', () => {
  let repository: MemoryRepository;
  let prismaMock: {
    memoryRecord: {
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
      memoryRecord: {
        create: jest.fn().mockResolvedValue({ id: 'm1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'm1' }),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([{ id: 'm1' }]),
        update: jest.fn().mockResolvedValue({ id: 'm1' }),
        delete: jest.fn().mockResolvedValue({ id: 'm1' }),
        count: jest.fn().mockResolvedValue(7),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<MemoryRepository>(MemoryRepository);
  });

  it('create persists via prisma', async () => {
    await repository.create({ userId: 'u1', type: 'FACT', content: 'x' } as never);
    expect(prismaMock.memoryRecord.create).toHaveBeenCalled();
  });

  it('findById uses prisma findUnique', async () => {
    await repository.findById('m1');
    expect(prismaMock.memoryRecord.findUnique).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  describe('findAll', () => {
    it('paginates with skip/take and orderBy createdAt desc', async () => {
      await repository.findAll({ userId: 'u1' } as never, 2, 10);
      const args = prismaMock.memoryRecord.findMany.mock.calls[0][0];
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('applies type filter when set', async () => {
      await repository.findAll({ userId: 'u1', type: 'FACT' } as never, 1, 20);
      const args = prismaMock.memoryRecord.findMany.mock.calls[0][0];
      expect(args.where.type).toBe('FACT');
    });

    it('applies isEnabled filter when set', async () => {
      await repository.findAll({ userId: 'u1', isEnabled: true } as never, 1, 20);
      const args = prismaMock.memoryRecord.findMany.mock.calls[0][0];
      expect(args.where.isEnabled).toBe(true);
    });

    it('applies content search when set', async () => {
      await repository.findAll({ userId: 'u1', search: 'foo' } as never, 1, 20);
      const args = prismaMock.memoryRecord.findMany.mock.calls[0][0];
      expect(args.where.content).toEqual({ contains: 'foo', mode: 'insensitive' });
    });
  });

  it('update delegates to prisma.update', async () => {
    await repository.update('m1', { content: 'new' } as never);
    expect(prismaMock.memoryRecord.update).toHaveBeenCalledWith({
      where: { id: 'm1' },
      data: { content: 'new' },
    });
  });

  it('delete delegates to prisma.delete', async () => {
    await repository.delete('m1');
    expect(prismaMock.memoryRecord.delete).toHaveBeenCalledWith({ where: { id: 'm1' } });
  });

  it('findEnabledByUserId queries enabled-only with the V2 pause-aware filter', async () => {
    await repository.findEnabledByUserId('u1', 25);
    const args = prismaMock.memoryRecord.findMany.mock.calls[0][0];
    expect(args.where.userId).toBe('u1');
    expect(args.where.isEnabled).toBe(true);
    // V2 (ADR-034): pause filter applied as OR on pausedUntil
    expect(Array.isArray(args.where.OR)).toBe(true);
    // V2: pinned items lifted first; updatedAt desc as secondary
    expect(args.orderBy).toEqual([{ pinned: 'desc' }, { updatedAt: 'desc' }]);
    expect(args.take).toBe(25);
  });

  describe('existsSimilar', () => {
    it('returns true when a matching record exists', async () => {
      prismaMock.memoryRecord.findFirst = jest.fn().mockResolvedValue({ id: 'existing' });
      const result = await repository.existsSimilar(
        'u1',
        'FACT' as never,
        'A long content string that is more than 100 chars long, used to test the slice behavior',
      );
      expect(result).toBe(true);
    });

    it('returns false when no matching record exists', async () => {
      const result = await repository.existsSimilar('u1', 'FACT' as never, 'unique');
      expect(result).toBe(false);
    });

    it('truncates content to first 100 chars in the contains query', async () => {
      const long = 'a'.repeat(500);
      await repository.existsSimilar('u1', 'FACT' as never, long);
      const args = prismaMock.memoryRecord.findFirst.mock.calls[0][0];
      expect(args.where.content.contains).toHaveLength(100);
    });
  });

  it('countAll returns prisma count', async () => {
    const result = await repository.countAll({ userId: 'u1' } as never);
    expect(result).toBe(7);
  });
});
