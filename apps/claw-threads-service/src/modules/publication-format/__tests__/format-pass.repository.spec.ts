import { describe, expect, it, vi } from 'vitest';

import { FormatPassRepository } from '../repositories/format-pass.repository';

function make(options: { count?: number; replay?: unknown; revision?: unknown } = {}) {
  const tx = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    threadFormatPass: {
      findUnique: vi.fn().mockResolvedValue(options.replay ?? null),
      count: vi.fn().mockResolvedValue(options.count ?? 0),
      create: vi.fn().mockResolvedValue({ id: 'pass-1' }),
    },
  };
  const prisma = {
    $transaction: (run: (client: typeof tx) => unknown) => run(tx),
    threadPublicationRevision: { findFirst: vi.fn().mockResolvedValue(options.revision ?? null) },
    threadFormatPass: { count: vi.fn().mockResolvedValue(options.count ?? 0), updateMany: vi.fn() },
  };
  return { repository: new FormatPassRepository(prisma as never), prisma, tx };
}

const input = {
  publicationId: 'pub-1',
  ownerId: 'owner-1',
  revisionId: 'rev-1',
  idempotencyKey: 'key-12345678',
};

describe('FormatPassRepository', () => {
  it('only ever reads a Thread through its owner (another owner finds nothing)', async () => {
    const { repository, prisma } = make();
    expect(await repository.findOwnedTarget('pub-1', 'intruder')).toBeNull();
    expect(prisma.threadPublicationRevision.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicationId: 'pub-1', publication: { ownerId: 'intruder' } },
        orderBy: { revision: 'desc' },
      }),
    );
  });

  it('returns the newest revision with its text and citations', async () => {
    const { repository } = make({
      revision: {
        id: 'rev-9',
        title: 'T',
        content: {
          markdown: '# T',
          citations: [{ evidenceId: 'a1b2c3d4', url: 'https://example.com/a' }],
        },
        publication: { generationJobId: 'job-1', contentLocale: 'ar', publicationType: 'article' },
      },
    });
    expect(await repository.findOwnedTarget('pub-1', 'owner-1')).toMatchObject({
      revisionId: 'rev-9',
      markdown: '# T',
      generationJobId: 'job-1',
      contentLocale: 'ar',
    });
  });

  it('takes the Thread lock, counts the day and creates the pass', async () => {
    const { repository, tx } = make({ count: 2 });
    const result = await repository.reserve(input);
    expect(result).toEqual({ outcome: 'RESERVED', pass: { id: 'pass-1' } });
    expect(tx.$executeRaw).toHaveBeenCalled();
    expect(tx.threadFormatPass.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        publicationId: 'pub-1',
        status: 'FORMATTED',
      }) as unknown,
    });
  });

  it('counts only formatted passes toward the limit, so failed or skipped ones never lock the owner out', async () => {
    const { repository, prisma } = make({ count: 0 });
    await repository.countToday('pub-1');
    expect(prisma.threadFormatPass.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ status: 'FORMATTED' }) as unknown,
    });
  });

  it('bounds free skipped attempts so they cannot burn model spend without limit', async () => {
    const { repository, tx } = make({ count: 0 });
    tx.threadFormatPass.count.mockResolvedValueOnce(0).mockResolvedValueOnce(10);
    expect(await repository.reserve(input)).toEqual({ outcome: 'LIMIT', used: 10 });
    expect(tx.threadFormatPass.create).not.toHaveBeenCalled();
  });

  it('refuses the fourth pass of the day and creates nothing', async () => {
    const { repository, tx } = make({ count: 3 });
    expect(await repository.reserve(input)).toEqual({ outcome: 'LIMIT', used: 3 });
    expect(tx.threadFormatPass.create).not.toHaveBeenCalled();
  });

  it('replays a key the owner already used on the same Thread, even at the limit', async () => {
    const pass = { id: 'p', publicationId: 'pub-1', status: 'FORMATTED' };
    const { repository, tx } = make({ count: 3, replay: pass });
    expect(await repository.reserve(input)).toMatchObject({ outcome: 'REPLAY' });
    expect(tx.threadFormatPass.create).not.toHaveBeenCalled();
  });

  it('does not replay a key through a different Thread', async () => {
    const { repository } = make({
      replay: { id: 'p', publicationId: 'other-pub', status: 'FORMATTED' },
    });
    expect((await repository.reserve(input)).outcome).toBe('LIMIT');
  });
});
