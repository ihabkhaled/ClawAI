import { type Mock, vi } from 'vitest';
import { CrossThreadRetrievalRepository } from '../cross-thread-retrieval.repository';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

function repositoryWith(options: { thread?: unknown; family?: unknown[] }): {
  repository: CrossThreadRetrievalRepository;
  findFirst: Mock;
  threadFindMany: Mock;
  messageFindMany: Mock;
} {
  const findFirst = vi.fn().mockResolvedValue(options.thread ?? null);
  const threadFindMany = vi.fn().mockResolvedValue(options.family ?? []);
  const messageFindMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    chatThread: { findFirst, findMany: threadFindMany },
    chatMessage: { findMany: messageFindMany },
  } as unknown as PrismaService;
  return {
    repository: new CrossThreadRetrievalRepository(prisma),
    findFirst,
    threadFindMany,
    messageFindMany,
  };
}

describe('CrossThreadRetrievalRepository branch family', () => {
  it('uses the stored root for a branch', async () => {
    const { repository, findFirst } = repositoryWith({
      thread: { id: 'b', branchRootThreadId: 'root' },
    });

    await expect(repository.findBranchRoot('user-1', 'b')).resolves.toBe('root');
    expect(findFirst.mock.calls[0]?.[0].where).toEqual({ id: 'b', userId: 'user-1' });
  });

  it('treats a thread with no root as its own root', async () => {
    const { repository } = repositoryWith({ thread: { id: 't', branchRootThreadId: null } });

    await expect(repository.findBranchRoot('user-1', 't')).resolves.toBe('t');
  });

  it("returns null for another user's thread", async () => {
    const { repository } = repositoryWith({});

    await expect(repository.findBranchRoot('user-1', 'x')).resolves.toBeNull();
  });

  it('reads the family under the owner filter', async () => {
    const { repository, threadFindMany } = repositoryWith({
      family: [{ id: 'root' }, { id: 'b' }],
    });

    await expect(repository.findBranchFamilyIds('user-1', 'root')).resolves.toEqual(['root', 'b']);
    expect(threadFindMany.mock.calls[0]?.[0].where).toEqual({
      userId: 'user-1',
      OR: [{ id: 'root' }, { branchRootThreadId: 'root' }],
    });
  });

  it('excludes every listed thread from candidate search', async () => {
    const { repository, messageFindMany } = repositoryWith({});

    await repository.findCandidateThreads('user-1', ['a', 'b'], ['orchid']);

    expect(messageFindMany.mock.calls[0]?.[0].where.thread).toEqual({
      userId: 'user-1',
      isArchived: false,
      id: { notIn: ['a', 'b'] },
    });
  });
});
