import { Test, type TestingModule } from '@nestjs/testing';
import { ContextPacksRepository } from '../context-packs.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('ContextPacksRepository', () => {
  let repository: ContextPacksRepository;
  let prismaMock: {
    contextPack: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
    contextPackItem: {
      create: jest.Mock;
      delete: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      contextPack: {
        create: jest.fn().mockResolvedValue({ id: 'cp1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'cp1', items: [] }),
        findMany: jest.fn().mockResolvedValue([{ id: 'cp1' }]),
        update: jest.fn().mockResolvedValue({ id: 'cp1' }),
        delete: jest.fn().mockResolvedValue({ id: 'cp1' }),
        count: jest.fn().mockResolvedValue(5),
      },
      contextPackItem: {
        create: jest.fn().mockResolvedValue({ id: 'item-1' }),
        delete: jest.fn().mockResolvedValue({ id: 'item-1' }),
        update: jest.fn().mockResolvedValue({ id: 'item-1' }),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ContextPacksRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<ContextPacksRepository>(ContextPacksRepository);
  });

  it('create persists via prisma', async () => {
    await repository.create({ userId: 'u1', name: 'pack', description: 'd' } as never);
    expect(prismaMock.contextPack.create).toHaveBeenCalled();
  });

  it('findById includes items ordered by sortOrder asc', async () => {
    await repository.findById('cp1');
    const args = prismaMock.contextPack.findUnique.mock.calls[0][0];
    expect(args.where.id).toBe('cp1');
    expect(args.include.items.orderBy).toEqual({ sortOrder: 'asc' });
  });

  it('findAll paginates correctly', async () => {
    await repository.findAll({ userId: 'u1' } as never, 2, 10);
    const args = prismaMock.contextPack.findMany.mock.calls[0][0];
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
  });

  it('findAll applies search filter when set', async () => {
    await repository.findAll({ userId: 'u1', search: 'pack' } as never, 1, 20);
    const args = prismaMock.contextPack.findMany.mock.calls[0][0];
    expect(args.where.name).toEqual({ contains: 'pack', mode: 'insensitive' });
  });

  it('update delegates to prisma', async () => {
    await repository.update('cp1', { name: 'renamed' });
    expect(prismaMock.contextPack.update).toHaveBeenCalledWith({
      where: { id: 'cp1' },
      data: { name: 'renamed' },
    });
  });

  it('delete delegates to prisma', async () => {
    await repository.delete('cp1');
    expect(prismaMock.contextPack.delete).toHaveBeenCalledWith({ where: { id: 'cp1' } });
  });

  it('countAll returns prisma count', async () => {
    const result = await repository.countAll({ userId: 'u1' } as never);
    expect(result).toBe(5);
  });

  it('addItem persists via contextPackItem.create', async () => {
    await repository.addItem({ contextPackId: 'cp1', type: 'TEXT', content: 'x' } as never);
    expect(prismaMock.contextPackItem.create).toHaveBeenCalled();
  });

  it('removeItem deletes via contextPackItem.delete', async () => {
    await repository.removeItem('item-1');
    expect(prismaMock.contextPackItem.delete).toHaveBeenCalledWith({
      where: { id: 'item-1' },
    });
  });

  it('reorderItems updates each itemId with sortOrder index in a transaction', async () => {
    await repository.reorderItems('cp1', ['a', 'b', 'c']);
    expect(prismaMock.contextPackItem.update).toHaveBeenCalledTimes(3);
    expect(prismaMock.contextPackItem.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'a' },
      data: { sortOrder: 0 },
    });
    expect(prismaMock.contextPackItem.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'c' },
      data: { sortOrder: 2 },
    });
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });
});
