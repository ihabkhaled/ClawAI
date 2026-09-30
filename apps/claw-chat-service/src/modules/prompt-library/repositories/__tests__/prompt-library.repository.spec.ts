import { vi } from 'vitest';
import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';
import { PromptLibraryRepository } from '../prompt-library.repository';

function build() {
  const promptTemplate = {
    count: vi.fn().mockResolvedValue(0),
    create: vi.fn().mockResolvedValue({ id: 'n' }),
    findFirst: vi.fn().mockResolvedValue({ id: 't1' }),
    findMany: vi.fn().mockResolvedValue([]),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  const repository = new PromptLibraryRepository({ promptTemplate } as unknown as PrismaService);
  return { repository, promptTemplate };
}

describe('PromptLibraryRepository', () => {
  it('scopes list by user, orders favourites then recent use, and over-fetches by one', async () => {
    const { repository, promptTemplate } = build();
    await repository.list({ userId: 'u1', offset: 30, limit: 30 });
    expect(promptTemplate.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: [
        { isFavorite: 'desc' },
        { lastUsedAt: { sort: 'desc', nulls: 'last' } },
        { updatedAt: 'desc' },
        { id: 'asc' },
      ],
      skip: 30,
      take: 31,
    });
  });

  it('adds favourite, tag and text filters while keeping the user scope', async () => {
    const { repository, promptTemplate } = build();
    await repository.list({
      userId: 'u1',
      favorite: true,
      tag: 'work',
      q: 'plan',
      offset: 0,
      limit: 10,
    });
    expect(promptTemplate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'u1',
          isFavorite: true,
          tags: { has: 'work' },
          OR: [
            { title: { contains: 'plan', mode: 'insensitive' } },
            { body: { contains: 'plan', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('counts and finds by owner', async () => {
    const { repository, promptTemplate } = build();
    await repository.countForUser('u1');
    await repository.findOwned('t1', 'u1');
    expect(promptTemplate.count).toHaveBeenCalledWith({ where: { userId: 'u1' } });
    expect(promptTemplate.findFirst).toHaveBeenCalledWith({ where: { id: 't1', userId: 'u1' } });
  });

  it('update writes only for the owner and returns null when nothing matched', async () => {
    const { repository, promptTemplate } = build();
    await repository.update('t1', 'u1', { title: 'x' });
    expect(promptTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', userId: 'u1' },
      data: { title: 'x' },
    });
    promptTemplate.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.update('t1', 'other', { title: 'x' })).resolves.toBeNull();
  });

  it('delete reports whether a row of the owner was removed', async () => {
    const { repository, promptTemplate } = build();
    await expect(repository.delete('t1', 'u1')).resolves.toBe(true);
    expect(promptTemplate.deleteMany).toHaveBeenCalledWith({ where: { id: 't1', userId: 'u1' } });
    promptTemplate.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.delete('t1', 'other')).resolves.toBe(false);
  });

  it('recordUse increments the counter and stamps lastUsedAt for the owner', async () => {
    const { repository, promptTemplate } = build();
    await repository.recordUse('t1', 'u1');
    expect(promptTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: 't1', userId: 'u1' },
      data: { usageCount: { increment: 1 }, lastUsedAt: expect.any(Date) },
    });
    promptTemplate.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(repository.recordUse('t1', 'other')).resolves.toBeNull();
  });
});
