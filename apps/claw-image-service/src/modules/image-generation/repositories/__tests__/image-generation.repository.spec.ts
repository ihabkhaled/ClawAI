import { type Mock, vi } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ImageGenerationRepository } from '../image-generation.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('ImageGenerationRepository', () => {
  let repository: ImageGenerationRepository;
  let prismaMock: {
    imageGeneration: {
      create: Mock;
      findUnique: Mock;
      findMany: Mock;
      count: Mock;
      update: Mock;
    };
    imageGenerationEvent: { create: Mock };
    imageGenerationAsset: { create: Mock; findFirst: Mock };
    $transaction: Mock;
  };

  beforeEach(async () => {
    prismaMock = {
      imageGeneration: {
        create: vi.fn().mockResolvedValue({ id: 'g1', status: 'QUEUED' }),
        findUnique: vi.fn().mockResolvedValue({ id: 'g1' }),
        findMany: vi.fn().mockResolvedValue([{ id: 'g1' }]),
        count: vi.fn().mockResolvedValue(2),
        update: vi.fn().mockResolvedValue({ id: 'g1', status: 'COMPLETED' }),
      },
      imageGenerationEvent: { create: vi.fn().mockResolvedValue({ id: 'e1' }) },
      imageGenerationAsset: {
        create: vi.fn().mockResolvedValue({ id: 'a1' }),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      // The interactive transaction runs its callback against the same client.
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(prismaMock)),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [ImageGenerationRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();
    repository = module.get<ImageGenerationRepository>(ImageGenerationRepository);
  });

  it('create persists with status=QUEUED, default width/height=1024, includes assets', async () => {
    await repository.create({
      userId: 'u1',
      prompt: 'cat',
      provider: 'openai',
      model: 'dall-e-3',
    });
    const argsCall = prismaMock.imageGeneration.create.mock.calls[0];
    expect(argsCall).toBeDefined();
    const args = argsCall?.[0];
    expect(args.data.status).toBe('QUEUED');
    expect(args.data.width).toBe(1024);
    expect(args.data.height).toBe(1024);
    expect(args.include).toEqual({ assets: { where: { role: 'OUTPUT' } } });
  });

  it('create respects explicit width/height/quality/style', async () => {
    await repository.create({
      userId: 'u1',
      prompt: 'cat',
      provider: 'openai',
      model: 'dall-e-3',
      width: 512,
      height: 768,
      quality: 'hd',
      style: 'vivid',
    });
    const argsCall = prismaMock.imageGeneration.create.mock.calls[0];
    expect(argsCall).toBeDefined();
    const args = argsCall?.[0];
    expect(args.data.width).toBe(512);
    expect(args.data.height).toBe(768);
    expect(args.data.quality).toBe('hd');
  });

  it('findById uses prisma findUnique with assets', async () => {
    await repository.findById('g1');
    expect(prismaMock.imageGeneration.findUnique).toHaveBeenCalledWith({
      where: { id: 'g1' },
      include: { assets: { where: { role: 'OUTPUT' } } },
    });
  });

  it('findByUserId paginates with createdAt desc', async () => {
    await repository.findByUserId('u1', 2, 10);
    const argsCall = prismaMock.imageGeneration.findMany.mock.calls[0];
    expect(argsCall).toBeDefined();
    const args = argsCall?.[0];
    expect(args.where.userId).toBe('u1');
    expect(args.skip).toBe(10);
    expect(args.take).toBe(10);
    expect(args.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('countByUserId returns count', async () => {
    expect(await repository.countByUserId('u1')).toBe(2);
  });

  describe('updateStatus', () => {
    it('updates status without extras', async () => {
      await repository.updateStatus('g1', 'COMPLETED' as never);
      const argsCall = prismaMock.imageGeneration.update.mock.calls[0];
      expect(argsCall).toBeDefined();
      const args = argsCall?.[0];
      expect(args.data.status).toBe('COMPLETED');
    });

    it('merges errorCode + completedAt extras', async () => {
      const completedAt = new Date('2026-04-26T20:00:00Z');
      await repository.updateStatus('g1', 'FAILED' as never, {
        errorCode: 'PROVIDER_FAILURE',
        errorMessage: 'oops',
        completedAt,
      });
      const argsCall = prismaMock.imageGeneration.update.mock.calls[0];
      expect(argsCall).toBeDefined();
      const args = argsCall?.[0];
      expect(args.data.errorCode).toBe('PROVIDER_FAILURE');
      expect(args.data.completedAt).toBe(completedAt);
    });
  });

  it('createEvent persists via prisma', async () => {
    await repository.createEvent({ generationId: 'g1', status: 'COMPLETED' as never });
    expect(prismaMock.imageGenerationEvent.create).toHaveBeenCalled();
  });

  it('createAsset stores a generated picture as an OUTPUT asset', async () => {
    await repository.createAsset({
      generationId: 'g1',
      storageKey: 'sk',
      url: 'u',
      downloadUrl: 'd',
      mimeType: 'image/png',
    });
    expect(prismaMock.imageGenerationAsset.create.mock.calls[0]?.[0].data.role).toBe('OUTPUT');
  });

  describe('supersession and reference', () => {
    const data = { userId: 'u1', prompt: 'cat', provider: 'IMAGE_OPENAI', model: 'gpt-image-1' };

    it('createSuccessor creates the new row and points the predecessor at it in ONE transaction', async () => {
      prismaMock.imageGeneration.create.mockResolvedValue({ id: 'g2', status: 'QUEUED' });

      const successor = await repository.createSuccessor('g1', data);

      expect(successor.id).toBe('g2');
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.imageGeneration.update).toHaveBeenCalledWith({
        where: { id: 'g1' },
        data: { supersededById: 'g2' },
      });
      expect(prismaMock.imageGenerationAsset.create).not.toHaveBeenCalled();
    });

    it('createSuccessor carries the stored reference image across to the successor', async () => {
      prismaMock.imageGeneration.create.mockResolvedValue({ id: 'g2', status: 'QUEUED' });
      prismaMock.imageGenerationAsset.findFirst.mockResolvedValue({
        storageKey: 'file-ref',
        url: '/api/v1/files/download/file-ref',
        downloadUrl: '/api/v1/files/download/file-ref',
        mimeType: 'image/jpeg',
      });

      await repository.createSuccessor('g1', data);

      expect(prismaMock.imageGenerationAsset.findFirst).toHaveBeenCalledWith({
        where: { generationId: 'g1', role: 'REFERENCE' },
      });
      expect(prismaMock.imageGenerationAsset.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          generationId: 'g2',
          role: 'REFERENCE',
          storageKey: 'file-ref',
          mimeType: 'image/jpeg',
        }),
      });
    });

    it('createReferenceAsset stores the file-service id, never bytes', async () => {
      await repository.createReferenceAsset({
        generationId: 'g1',
        fileId: 'f1',
        mimeType: 'image/png',
      });
      const args = prismaMock.imageGenerationAsset.create.mock.calls[0]?.[0];
      expect(args.data).toEqual({
        generationId: 'g1',
        role: 'REFERENCE',
        storageKey: 'f1',
        url: '/api/v1/files/download/f1',
        downloadUrl: '/api/v1/files/download/f1',
        mimeType: 'image/png',
      });
    });

    it('findReferenceAsset reads only the REFERENCE row', async () => {
      await repository.findReferenceAsset('g1');
      expect(prismaMock.imageGenerationAsset.findFirst).toHaveBeenCalledWith({
        where: { generationId: 'g1', role: 'REFERENCE' },
      });
    });
  });

  it('findActiveByThreadId queries non-terminal statuses ordered by createdAt asc', async () => {
    await repository.findActiveByThreadId('t1');
    const argsCall = prismaMock.imageGeneration.findMany.mock.calls[0];
    expect(argsCall).toBeDefined();
    const args = argsCall?.[0];
    expect(args.where.threadId).toBe('t1');
    expect(args.where.status.in).toEqual(['QUEUED', 'STARTING', 'GENERATING', 'FINALIZING']);
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
  });
});
