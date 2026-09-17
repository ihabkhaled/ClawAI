import { ChatThreadsRepository } from '../chat-threads.repository';
import { SortOrder } from '../../../../common/enums';
import { ThreadOrigin } from '../../../../generated/prisma';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

function repositoryWithSpy(): {
  repository: ChatThreadsRepository;
  findMany: jest.Mock;
  count: jest.Mock;
} {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const prisma = { chatThread: { findMany, count } } as unknown as PrismaService;
  return { repository: new ChatThreadsRepository(prisma), findMany, count };
}

describe('thread listing is always narrowed to one origin', () => {
  it('lists web threads when no origin is asked for', async () => {
    const { repository, findMany } = repositoryWithSpy();

    await repository.findAll({ userId: 'user-1' }, 1, 20, 'updatedAt', SortOrder.DESC);

    expect(findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ userId: 'user-1', origin: ThreadOrigin.WEB }),
    );
  });

  it('lists coding agent threads when that origin is asked for', async () => {
    const { repository, findMany } = repositoryWithSpy();

    await repository.findAll(
      { userId: 'user-1', origin: ThreadOrigin.CODING_AGENT },
      1,
      20,
      'updatedAt',
      SortOrder.DESC,
    );

    expect(findMany.mock.calls[0][0].where.origin).toBe(ThreadOrigin.CODING_AGENT);
  });

  it('counts the same set it lists', async () => {
    // A count built from a different filter than the list is how a paginated
    // view ends up claiming pages that render empty.
    const { repository, count } = repositoryWithSpy();

    await repository.countAll({ userId: 'user-1' });

    expect(count.mock.calls[0][0].where).toEqual(
      expect.objectContaining({ origin: ThreadOrigin.WEB }),
    );
  });
});
