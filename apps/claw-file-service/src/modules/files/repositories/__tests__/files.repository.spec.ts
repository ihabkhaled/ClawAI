import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { FilesRepository } from '../files.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { FileIngestionStatus } from '../../../../generated/prisma';
import { effectiveIngestionStatusWhere } from '../../utilities/effective-ingestion-filter.utility';

describe('FilesRepository', () => {
  let repository: FilesRepository;
  let prismaMock: {
    file: {
      create: Mock;
      findUnique: Mock;
      findMany: Mock;
      update: Mock;
      updateMany: Mock;
      delete: Mock;
      count: Mock;
      groupBy: Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      file: {
        create: vi.fn().mockResolvedValue({ id: 'f1' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'f1', chunks: [] }),
        findMany: vi.fn().mockResolvedValue([{ id: 'f1' }, { id: 'f2' }]),
        update: vi.fn().mockResolvedValue({ id: 'f1' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        delete: vi.fn().mockResolvedValue({ id: 'f1' }),
        count: vi.fn().mockResolvedValue(3),
        groupBy: vi.fn().mockResolvedValue([]),
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
    const argsCall = prismaMock.file.findUnique.mock.calls[0];
    expect(argsCall).toBeDefined();
    const args = argsCall?.[0];
    expect(args.where.id).toBe('f1');
    expect(args.include.chunks.orderBy).toEqual({ chunkIndex: 'asc' });
  });

  describe('saveVideoExtractionResult (conditional, pack section 72)', () => {
    const write = {
      extractedText: null,
      extractionError: 'Processing was cancelled.',
      status: FileIngestionStatus.FAILED,
      metadata: { media: { sizeBytes: 1, processedAt: '2026-09-25T00:00:00Z' } },
    };

    it('writes only while the row is still the awaiting placeholder', async () => {
      await expect(repository.saveVideoExtractionResult('f1', write)).resolves.toBe(true);
      const args = prismaMock.file.updateMany.mock.calls[0]?.[0];
      expect(args.where).toEqual({
        id: 'f1',
        ingestionStatus: FileIngestionStatus.COMPLETED,
        extractionError: null,
        extractedText: { startsWith: '[Video file: ' },
      });
      expect(args.data).toMatchObject({
        extractionError: 'Processing was cancelled.',
        ingestionStatus: FileIngestionStatus.FAILED,
      });
      expect(prismaMock.file.update).not.toHaveBeenCalled();
    });

    it('reports false when the row already settled (a late job, or a lost cancel race)', async () => {
      prismaMock.file.updateMany.mockResolvedValue({ count: 0 });
      await expect(repository.saveVideoExtractionResult('f1', write)).resolves.toBe(false);
    });
  });

  describe('findAll', () => {
    it('paginates with skip/take and createdAt desc', async () => {
      await repository.findAll({ userId: 'u1' } as never, 2, 10);
      const argsCall = prismaMock.file.findMany.mock.calls[0];
      expect(argsCall).toBeDefined();
      const args = argsCall?.[0];
      expect(args.skip).toBe(10);
      expect(args.take).toBe(10);
      expect(args.orderBy).toEqual({ createdAt: 'desc' });
    });

    it('applies the ingestionStatus filter as the EFFECTIVE status, not the stored column', async () => {
      const now = Date.parse('2026-09-25T12:00:00Z');
      await repository.findAll(
        { userId: 'u1', ingestionStatus: FileIngestionStatus.PROCESSING, now },
        1,
        20,
      );
      const argsCall = prismaMock.file.findMany.mock.calls[0];
      expect(argsCall).toBeDefined();
      const args = argsCall?.[0];
      expect(args.where.ingestionStatus).toBeUndefined();
      expect(args.where.AND).toEqual([
        effectiveIngestionStatusWhere(FileIngestionStatus.PROCESSING, now),
      ]);
      expect(args.where.userId).toBe('u1');
    });

    it('counts with the same effective-status condition it lists with', async () => {
      const now = Date.parse('2026-09-25T12:00:00Z');
      const filters = { userId: 'u1', ingestionStatus: FileIngestionStatus.COMPLETED, now };
      await repository.findAll(filters, 1, 20);
      await repository.countAll(filters);
      const listed = prismaMock.file.findMany.mock.calls[0]?.[0];
      const counted = prismaMock.file.count.mock.calls[0]?.[0];
      expect(counted.where).toEqual(listed.where);
    });

    it('applies filename search filter', async () => {
      await repository.findAll({ userId: 'u1', search: 'doc' } as never, 1, 20);
      const argsCall = prismaMock.file.findMany.mock.calls[0];
      expect(argsCall).toBeDefined();
      const args = argsCall?.[0];
      expect(args.where.filename).toEqual({ contains: 'doc', mode: 'insensitive' });
    });

    it('lists top-level rows only by default, so children do not fill the page', async () => {
      await repository.findAll({ userId: 'u1' } as never, 1, 20);
      const args = prismaMock.file.findMany.mock.calls[0]?.[0];
      expect(args.where.parentFileId).toBeNull();
    });

    it("lists one archive's children when a parent is named", async () => {
      await repository.findAll({ userId: 'u1', parentFileId: 'zip-1' } as never, 1, 20);
      const args = prismaMock.file.findMany.mock.calls[0]?.[0];
      expect(args.where).toMatchObject({ userId: 'u1', parentFileId: 'zip-1' });
    });

    it('always scopes by userId', async () => {
      await repository.findAll({ userId: 'u1' } as never, 1, 20);
      const argsCall = prismaMock.file.findMany.mock.calls[0];
      expect(argsCall).toBeDefined();
      const args = argsCall?.[0];
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

  describe('archive reads', () => {
    it('countChildrenByParent groups by parent and skips the query for no ids', async () => {
      expect((await repository.countChildrenByParent([])).size).toBe(0);
      expect(prismaMock.file.groupBy).not.toHaveBeenCalled();

      prismaMock.file.groupBy.mockResolvedValue([
        { parentFileId: 'zip-1', _count: { _all: 4 } },
        { parentFileId: null, _count: { _all: 9 } },
      ]);
      const counts = await repository.countChildrenByParent(['zip-1', 'f2']);

      expect(prismaMock.file.groupBy).toHaveBeenCalledWith({
        by: ['parentFileId'],
        where: { parentFileId: { in: ['zip-1', 'f2'] } },
        _count: { _all: true },
      });
      expect([...counts.entries()]).toEqual([['zip-1', 4]]);
    });

    it('findArchiveParent never selects the original bytes', async () => {
      await repository.findArchiveParent('zip-1');
      const args = prismaMock.file.findUnique.mock.calls[0]?.[0];
      expect(args.where).toEqual({ id: 'zip-1' });
      expect(args.select.content).toBeUndefined();
      expect(args.select.extractedText).toBe(true);
    });

    it('findArchiveChildren is path-ordered and capped', async () => {
      await repository.findArchiveChildren('zip-1', 50);
      const args = prismaMock.file.findMany.mock.calls[0]?.[0];
      expect(args.where).toEqual({ parentFileId: 'zip-1' });
      expect(args.orderBy).toEqual({ archivePath: 'asc' });
      expect(args.take).toBe(50);
      expect(args.select.content).toBeUndefined();
    });

    it('countArchiveChildren counts one parent', async () => {
      await repository.countArchiveChildren('zip-1');
      expect(prismaMock.file.count).toHaveBeenCalledWith({ where: { parentFileId: 'zip-1' } });
    });
  });

  it('countAll returns count from prisma', async () => {
    const result = await repository.countAll({ userId: 'u1' } as never);
    expect(result).toBe(3);
  });
});
