import { Test, type TestingModule } from '@nestjs/testing';
import { FileGenerationRepository } from '../file-generation.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('FileGenerationRepository', () => {
  let repository: FileGenerationRepository;
  let prismaMock: {
    fileGeneration: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    fileGenerationEvent: { create: jest.Mock };
    fileGenerationAsset: { create: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      fileGeneration: {
        create: jest.fn().mockResolvedValue({ id: 'g1', status: 'QUEUED' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'g1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]),
        count: jest.fn().mockResolvedValue(5),
        update: jest.fn().mockResolvedValue({ id: 'g1', status: 'COMPLETED' }),
      },
      fileGenerationEvent: { create: jest.fn().mockResolvedValue({ id: 'e1' }) },
      fileGenerationAsset: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileGenerationRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<FileGenerationRepository>(FileGenerationRepository);
  });

  it('create persists with status=QUEUED and includes assets', async () => {
    await repository.create({
      userId: 'u1',
      prompt: 'p',
      content: 'c',
      format: 'PDF' as never,
      provider: 'openai',
      model: 'gpt-4',
    });
    const args = prismaMock.fileGeneration.create.mock.calls[0][0];
    expect(args.data.status).toBe('QUEUED');
    expect(args.include.assets).toBe(true);
  });

  it('findById uses prisma findUnique with assets included', async () => {
    await repository.findById('g1');
    const args = prismaMock.fileGeneration.findUnique.mock.calls[0][0];
    expect(args.where.id).toBe('g1');
    expect(args.include.assets).toBe(true);
  });

  it('findByUserId paginates with desc ordering', async () => {
    await repository.findByUserId('u1', 2, 10);
    const args = prismaMock.fileGeneration.findMany.mock.calls[0][0];
    expect(args.where.userId).toBe('u1');
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('countByUserId returns prisma count', async () => {
    const result = await repository.countByUserId('u1');
    expect(result).toBe(5);
  });

  describe('updateStatus', () => {
    it('updates status without extras', async () => {
      await repository.updateStatus('g1', 'COMPLETED' as never);
      const args = prismaMock.fileGeneration.update.mock.calls[0][0];
      expect(args.where.id).toBe('g1');
      expect(args.data.status).toBe('COMPLETED');
    });

    it('merges extras like errorCode + completedAt', async () => {
      const completedAt = new Date('2026-04-26T20:00:00Z');
      await repository.updateStatus('g1', 'FAILED' as never, {
        errorCode: 'CONVERSION_FAILURE',
        errorMessage: 'oops',
        completedAt,
      });
      const args = prismaMock.fileGeneration.update.mock.calls[0][0];
      expect(args.data.errorCode).toBe('CONVERSION_FAILURE');
      expect(args.data.completedAt).toBe(completedAt);
    });
  });

  it('createEvent persists via fileGenerationEvent.create', async () => {
    await repository.createEvent({ generationId: 'g1', status: 'COMPLETED' as never });
    expect(prismaMock.fileGenerationEvent.create).toHaveBeenCalledWith({
      data: { generationId: 'g1', status: 'COMPLETED' },
    });
  });

  it('createAsset persists via fileGenerationAsset.create', async () => {
    await repository.createAsset({
      generationId: 'g1',
      storageKey: 'sk',
      url: 'u',
      downloadUrl: 'd',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
    });
    expect(prismaMock.fileGenerationAsset.create).toHaveBeenCalled();
  });
});
