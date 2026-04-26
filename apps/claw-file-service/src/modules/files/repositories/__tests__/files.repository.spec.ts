import { Test, type TestingModule } from '@nestjs/testing';
import { FilesRepository } from '../files.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('FilesRepository', () => {
  let repository: FilesRepository;
  let prismaMock: {
    file: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      file: {
        create: jest.fn().mockResolvedValue({ id: 'f1' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'f1', chunks: [] }),
        findMany: jest.fn().mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]),
        update: jest.fn().mockResolvedValue({ id: 'f1' }),
        delete: jest.fn().mockResolvedValue({ id: 'f1' }),
        count: jest.fn().mockResolvedValue(3),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FilesRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<FilesRepository>(FilesRepository);
  });

  it('create persists via prisma', async () => {
    await repository.create({
      userId: 'u1',
      filename: 'a.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 100,
      storagePath: '/x',
    } as never);
    expect(prismaMock.file.create).toHaveBeenCalled();
  });

  it('findById includes chunks ordered by chunkIndex asc', async () => {
    await repository.findById('f1');
    const args = prismaMock.file.findUnique.mock.calls[0][0];
    expect(args.where.id).toBe('f1');
    expect(args.include.chunks.orderBy).toEqual({ chunkIndex: 'asc' });
  });

  describe('findAll', () => {
    it('paginates with skip/take and createdAt desc', async () => {
      await repository.findAll({ userId: 'u1' } as never, 2, 10);
      const args = prismaMock.file.findMany.mock.calls[0][0];
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('applies ingestionStatus filter', async () => {
      await repository.findAll({ userId: 'u1', ingestionStatus: 'COMPLETED' } as never, 1, 20);
      const args = prismaMock.file.findMany.mock.calls[0][0];
      expect(args.where.ingestionStatus).toBe('COMPLETED');
    });

    it('applies filename search filter', async () => {
      await repository.findAll({ userId: 'u1', search: 'doc' } as never, 1, 20);
      const args = prismaMock.file.findMany.mock.calls[0][0];
      expect(args.where.filename).toEqual({ contains: 'doc', mode: 'insensitive' });
    });

    it('always scopes by userId', async () => {
      await repository.findAll({ userId: 'u1' } as never, 1, 20);
      const args = prismaMock.file.findMany.mock.calls[0][0];
      expect(args.where.userId).toBe('u1');
    });
  });

  it('updateIngestionStatus updates via prisma', async () => {
    await repository.updateIngestionStatus('f1', 'COMPLETED' as never);
    expect(prismaMock.file.update).toHaveBeenCalledWith({
      where: { id: 'f1' },
      data: { ingestionStatus: 'COMPLETED' },
    });
  });

  it('delete delegates to prisma', async () => {
    await repository.delete('f1');
    expect(prismaMock.file.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
  });

  it('countAll returns count from prisma', async () => {
    const result = await repository.countAll({ userId: 'u1' } as never);
    expect(result).toBe(3);
  });
});
