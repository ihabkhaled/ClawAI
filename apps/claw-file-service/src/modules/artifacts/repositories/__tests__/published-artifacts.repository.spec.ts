import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { ARTIFACT_SUMMARY_SELECT } from '../../constants/artifact-summary-select.constants';
import { PublishedArtifactsRepository } from '../published-artifacts.repository';

describe('PublishedArtifactsRepository', () => {
  let repository: PublishedArtifactsRepository;
  const delegate = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    deleteMany: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        PublishedArtifactsRepository,
        { provide: PrismaService, useValue: { publishedArtifact: delegate } },
      ],
    }).compile();
    repository = moduleRef.get(PublishedArtifactsRepository);
  });

  it('creates and returns only the summary columns', async () => {
    const data = {
      publicId: 'p',
      userId: 'u',
      title: null,
      filename: 'a.txt',
      mimeType: 'text/plain',
      content: 'hi',
      sizeBytes: 2,
      sha256: 's',
    };
    await repository.create(data);
    expect(delegate.create).toHaveBeenCalledWith({ data, select: ARTIFACT_SUMMARY_SELECT });
    expect(ARTIFACT_SUMMARY_SELECT).not.toHaveProperty('content');
  });

  it('finds by public id', async () => {
    await repository.findByPublicId('p');
    expect(delegate.findUnique).toHaveBeenCalledWith({ where: { publicId: 'p' } });
  });

  it('lists a user page newest first without content', async () => {
    await repository.findByUser('u', 3, 10);
    expect(delegate.findMany).toHaveBeenCalledWith({
      where: { userId: 'u' },
      select: ARTIFACT_SUMMARY_SELECT,
      orderBy: { createdAt: 'desc' },
      skip: 20,
      take: 10,
    });
  });

  it('counts a user rows', async () => {
    delegate.count.mockResolvedValue(4);
    await expect(repository.countByUser('u')).resolves.toBe(4);
    expect(delegate.count).toHaveBeenCalledWith({ where: { userId: 'u' } });
  });

  it('deletes only when both id and owner match', async () => {
    delegate.deleteMany.mockResolvedValue({ count: 0 });
    await expect(repository.deleteOwned('a', 'intruder')).resolves.toBe(0);
    expect(delegate.deleteMany).toHaveBeenCalledWith({ where: { id: 'a', userId: 'intruder' } });
  });
});
