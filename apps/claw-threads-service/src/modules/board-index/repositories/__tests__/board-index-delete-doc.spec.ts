import { vi } from 'vitest';

import { BoardIndexRepository } from '../board-index.repository';

describe('BoardIndexRepository.deleteDoc', () => {
  const build = (deleted: number) => {
    const calls: string[] = [];
    const tx = {
      $executeRaw: vi.fn(() => {
        calls.push('dictionary');
        return Promise.resolve(0);
      }),
      threadPublicationSearchDoc: {
        deleteMany: vi.fn(() => {
          calls.push('doc');
          return Promise.resolve({ count: deleted });
        }),
      },
    };
    const prisma = { $transaction: vi.fn((work: (client: typeof tx) => unknown) => work(tx)) };
    return { calls, repository: new BoardIndexRepository(prisma as never), tx };
  };

  it('removes the words only this doc contributed before the doc itself, in one transaction', async () => {
    const { calls, repository, tx } = build(1);

    await expect(repository.deleteDoc('p1')).resolves.toBe(true);

    expect(calls).toEqual(['dictionary', 'doc']);
    expect(tx.threadPublicationSearchDoc.deleteMany).toHaveBeenCalledWith({
      where: { publicationId: 'p1' },
    });
  });

  it('reports false when there was no doc to remove', async () => {
    const { repository } = build(0);

    await expect(repository.deleteDoc('missing')).resolves.toBe(false);
  });
});
