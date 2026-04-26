import { Test, type TestingModule } from '@nestjs/testing';
import { FileChunksRepository } from '../file-chunks.repository';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

describe('FileChunksRepository', () => {
  let repository: FileChunksRepository;
  let prismaMock: {
    fileChunk: {
      createMany: jest.Mock;
      findMany: jest.Mock;
      deleteMany: jest.Mock;
    };
  };

  beforeEach(async () => {
    prismaMock = {
      fileChunk: {
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
        findMany: jest.fn().mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [FileChunksRepository, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    repository = module.get<FileChunksRepository>(FileChunksRepository);
  });

  it('createMany returns prisma count', async () => {
    const result = await repository.createMany([
      { fileId: 'f1', chunkIndex: 0, content: 'x' },
    ] as never);
    expect(result).toBe(5);
    expect(prismaMock.fileChunk.createMany).toHaveBeenCalledWith({
      data: [{ fileId: 'f1', chunkIndex: 0, content: 'x' }],
    });
  });

  it('findByFileId orders by chunkIndex asc', async () => {
    const result = await repository.findByFileId('f1');
    expect(prismaMock.fileChunk.findMany).toHaveBeenCalledWith({
      where: { fileId: 'f1' },
      orderBy: { chunkIndex: 'asc' },
    });
    expect(result).toEqual([{ id: 'c1' }, { id: 'c2' }]);
  });

  it('deleteByFileId returns count', async () => {
    const result = await repository.deleteByFileId('f1');
    expect(result).toBe(5);
    expect(prismaMock.fileChunk.deleteMany).toHaveBeenCalledWith({ where: { fileId: 'f1' } });
  });
});
