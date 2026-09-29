import { type Mock, vi } from 'vitest';
import { ChatThreadsRepository } from '../chat-threads.repository';
import { Prisma } from '../../../../generated/prisma';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

/**
 * What a branch copy keeps. The first implementation copied text and model
 * only, so a branch lost its attachments (they live in `metadata.fileIds`) and
 * — because every copied row took the same default timestamp — came back in an
 * order Postgres chose.
 */
function repositoryWithTransaction(source: Record<string, unknown>[]): {
  repository: ChatThreadsRepository;
  createMany: Mock;
  threadFindMany: Mock;
} {
  const createMany = vi.fn().mockResolvedValue({ count: source.length });
  const transaction = {
    $executeRaw: vi.fn().mockResolvedValue(1),
    chatThread: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue({ id: 'branch-1' }),
    },
    chatMessage: { findMany: vi.fn().mockResolvedValue(source), createMany },
  };
  const threadFindMany = vi.fn().mockResolvedValue([]);
  const prisma = {
    $transaction: async (run: (tx: typeof transaction) => Promise<unknown>) => run(transaction),
    chatThread: { findMany: threadFindMany, findFirst: vi.fn().mockResolvedValue(null) },
  } as unknown as PrismaService;
  return { repository: new ChatThreadsRepository(prisma), createMany, threadFindMany };
}

const sourceMessage = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  id: 'm-1',
  threadId: 'source',
  role: 'USER',
  content: 'hello',
  provider: null,
  model: null,
  routingMode: null,
  routerModel: null,
  usedFallback: false,
  inputTokens: null,
  outputTokens: null,
  estimatedCost: null,
  latencyMs: null,
  metadata: null,
  originalContent: null,
  editedAt: null,
  createdAt: new Date('2026-09-01T10:00:00Z'),
  ...overrides,
});

describe('ChatThreadsRepository.createBranchWithinDailyLimit', () => {
  it('keeps each message timestamp, metadata and run figures, with a fresh id', async () => {
    const first = sourceMessage({
      id: 'm-1',
      metadata: { fileIds: ['file-1'] },
      createdAt: new Date('2026-09-01T10:00:00Z'),
    });
    const second = sourceMessage({
      id: 'm-2',
      role: 'ASSISTANT',
      content: 'answer',
      inputTokens: 12,
      outputTokens: 34,
      latencyMs: 900,
      createdAt: new Date('2026-09-01T10:00:05Z'),
    });
    const { repository, createMany } = repositoryWithTransaction([first, second]);

    await repository.createBranchWithinDailyLimit(
      { userId: 'user-1' },
      null,
      'source',
      new Date('2026-09-01T10:00:05Z'),
    );

    const rows = (createMany.mock.calls[0]?.[0] as { data: Record<string, unknown>[] }).data;
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      threadId: 'branch-1',
      metadata: { fileIds: ['file-1'] },
      createdAt: first['createdAt'],
    });
    expect(rows[1]).toMatchObject({
      inputTokens: 12,
      outputTokens: 34,
      latencyMs: 900,
      createdAt: second['createdAt'],
    });
    expect(rows[0]).not.toHaveProperty('id');
  });

  it('writes an explicit JSON null for a message with no metadata', async () => {
    const { repository, createMany } = repositoryWithTransaction([sourceMessage({})]);

    await repository.createBranchWithinDailyLimit({ userId: 'user-1' }, null, 'source', new Date());

    const rows = (createMany.mock.calls[0]?.[0] as { data: Record<string, unknown>[] }).data;
    expect(rows[0]?.['metadata']).toBe(Prisma.JsonNull);
  });
});

describe('ChatThreadsRepository branch cut', () => {
  function findManyWhere(includePivot: boolean): Promise<unknown> {
    const findMany = vi.fn().mockResolvedValue([]);
    const transaction = {
      $executeRaw: vi.fn().mockResolvedValue(1),
      chatThread: { count: vi.fn(), create: vi.fn().mockResolvedValue({ id: 'b' }) },
      chatMessage: { findMany, createMany: vi.fn().mockResolvedValue({ count: 0 }) },
    };
    const prisma = {
      $transaction: async (run: (tx: typeof transaction) => Promise<unknown>) => run(transaction),
    } as unknown as PrismaService;
    const cutoff = new Date('2026-09-01T10:00:00Z');
    return new ChatThreadsRepository(prisma)
      .createBranchWithinDailyLimit({ userId: 'u' }, null, 's', cutoff, includePivot)
      .then(() => findMany.mock.calls[0]?.[0].where.createdAt);
  }

  it('keeps the pivot by default', async () => {
    await expect(findManyWhere(true)).resolves.toEqual({ lte: new Date('2026-09-01T10:00:00Z') });
  });

  it('stops just short of the pivot for an edit-in-a-branch', async () => {
    await expect(findManyWhere(false)).resolves.toEqual({ lt: new Date('2026-09-01T10:00:00Z') });
  });
});

describe('ChatThreadsRepository lineage reads are owner-scoped', () => {
  it('lists direct branches only for the same user', async () => {
    const { repository, threadFindMany } = repositoryWithTransaction([]);

    await repository.findDirectBranches('user-1', 'thread-1');

    expect(threadFindMany.mock.calls[0]?.[0].where).toEqual({
      userId: 'user-1',
      branchedFromThreadId: 'thread-1',
    });
  });
});
