import { Test, type TestingModule } from '@nestjs/testing';
import { ImageGenerationRepository } from '../image-generation.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('ImageGenerationRepository', () => {
  let repository: ImageGenerationRepository;
  let prismaMock: {
    imageGeneration: {
      create: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
    imageGenerationEvent: { create: jest.Mock };
    imageGenerationAsset: { create: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      imageGeneration: {
        create: jest.fn().mockResolvedValue({ id: 'g1', status: 'QUEUED' }),
        findUnique: jest.fn().mockResolvedValue({ id: 'g1' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'g1' }]),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn().mockResolvedValue({ id: 'g1', status: 'COMPLETED' }),
      },
      imageGenerationEvent: { create: jest.fn().mockResolvedValue({ id: 'e1' }) },
      imageGenerationAsset: { create: jest.fn().mockResolvedValue({ id: 'a1' }) },
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
    const args = prismaMock.imageGeneration.create.mock.calls[0][0];
    expect(args.data.status).toBe('QUEUED');
    expect(args.data.width).toBe(1024);
    expect(args.data.height).toBe(1024);
    expect(args.include.assets).toBe(true);
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
    const args = prismaMock.imageGeneration.create.mock.calls[0][0];
    expect(args.data.width).toBe(512);
    expect(args.data.height).toBe(768);
    expect(args.data.quality).toBe('hd');
  });

  it('findById uses prisma findUnique with assets', async () => {
    await repository.findById('g1');
    expect(prismaMock.imageGeneration.findUnique).toHaveBeenCalledWith({
      where: { id: 'g1' },
      include: { assets: true },
    });
  });

  it('findByUserId paginates with createdAt desc', async () => {
    await repository.findByUserId('u1', 2, 10);
    const args = prismaMock.imageGeneration.findMany.mock.calls[0][0];
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
      const args = prismaMock.imageGeneration.update.mock.calls[0][0];
      expect(args.data.status).toBe('COMPLETED');
    });

    it('merges errorCode + completedAt extras', async () => {
      const completedAt = new Date('2026-04-26T20:00:00Z');
      await repository.updateStatus('g1', 'FAILED' as never, {
        errorCode: 'PROVIDER_FAILURE',
        errorMessage: 'oops',
        completedAt,
      });
      const args = prismaMock.imageGeneration.update.mock.calls[0][0];
      expect(args.data.errorCode).toBe('PROVIDER_FAILURE');
      expect(args.data.completedAt).toBe(completedAt);
    });
  });

  it('createEvent persists via prisma', async () => {
    await repository.createEvent({ generationId: 'g1', status: 'COMPLETED' as never });
    expect(prismaMock.imageGenerationEvent.create).toHaveBeenCalled();
  });

  it('createAsset persists via prisma', async () => {
    await repository.createAsset({
      generationId: 'g1',
      storageKey: 'sk',
      url: 'u',
      downloadUrl: 'd',
      mimeType: 'image/png',
    });
    expect(prismaMock.imageGenerationAsset.create).toHaveBeenCalled();
  });

  it('findActiveByThreadId queries non-terminal statuses ordered by createdAt asc', async () => {
    await repository.findActiveByThreadId('t1');
    const args = prismaMock.imageGeneration.findMany.mock.calls[0][0];
    expect(args.where.threadId).toBe('t1');
    expect(args.where.status.in).toEqual(['QUEUED', 'STARTING', 'GENERATING', 'FINALIZING']);
    expect(args.orderBy).toEqual({ createdAt: 'asc' });
  });
});
