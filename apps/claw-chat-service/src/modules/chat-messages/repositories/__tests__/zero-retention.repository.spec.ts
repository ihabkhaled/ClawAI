import { describe, expect, it, vi } from 'vitest';

import { ZERO_RETENTION_REDACTED_CONTENT } from '../../constants/zero-retention.constants';
import type {
  ZeroRetentionMessageRow,
  ZeroRetentionPrismaPort,
} from '../../types/zero-retention.types';
import { ZeroRetentionRepository } from '../zero-retention.repository';

function build(rows: ZeroRetentionMessageRow[]): {
  repository: ZeroRetentionRepository;
  findMany: ReturnType<typeof vi.fn<ZeroRetentionPrismaPort['chatMessage']['findMany']>>;
  update: ReturnType<typeof vi.fn<ZeroRetentionPrismaPort['chatMessage']['update']>>;
} {
  const findMany = vi.fn<ZeroRetentionPrismaPort['chatMessage']['findMany']>(async () => rows);
  const update = vi.fn<ZeroRetentionPrismaPort['chatMessage']['update']>(async () => ({}));
  const prisma: ZeroRetentionPrismaPort = { chatMessage: { findMany, update } };
  return { repository: new ZeroRetentionRepository(prisma), findMany, update };
}

describe('ZeroRetentionRepository.redactTurn', () => {
  it('selects every message of a Runtime V2 run by its run id, inside the thread', async () => {
    const { repository, findMany } = build([]);

    await expect(repository.redactTurn({ threadId: 'thread-1', runId: 'run-1' })).resolves.toBe(0);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        threadId: 'thread-1',
        metadata: { path: ['runtimeV2', 'runId'], equals: 'run-1' },
      },
      select: { id: true, metadata: true },
    });
  });

  it('selects a chat turn as its prompt plus the answer that names it as source', async () => {
    const { repository, findMany } = build([]);

    await repository.redactTurn({ threadId: 'thread-1', userMessageId: 'msg-1' });
    expect(findMany).toHaveBeenCalledWith({
      where: {
        threadId: 'thread-1',
        OR: [{ id: 'msg-1' }, { metadata: { path: ['sourceMessageId'], equals: 'msg-1' } }],
      },
      select: { id: true, metadata: true },
    });
  });

  it('replaces content, clears the pre-edit original and redacts metadata — and touches no usage column', async () => {
    const { repository, update } = build([
      { id: 'msg-1', metadata: { runtimeV2: { runId: 'run-1' } } },
      { id: 'msg-2', metadata: { sourceMessageId: 'msg-1', reasoning: 'private' } },
    ]);

    await expect(repository.redactTurn({ threadId: 'thread-1', runId: 'run-1' })).resolves.toBe(2);
    expect(update).toHaveBeenNthCalledWith(1, {
      where: { id: 'msg-1' },
      data: {
        content: ZERO_RETENTION_REDACTED_CONTENT,
        originalContent: null,
        metadata: { runtimeV2: { runId: 'run-1' }, zeroRetention: true },
      },
    });
    expect(update).toHaveBeenNthCalledWith(2, {
      where: { id: 'msg-2' },
      data: {
        content: ZERO_RETENTION_REDACTED_CONTENT,
        originalContent: null,
        metadata: { sourceMessageId: 'msg-1', zeroRetention: true },
      },
    });
    for (const [args] of update.mock.calls) {
      expect(Object.keys(args.data).sort()).toEqual(['content', 'metadata', 'originalContent']);
    }
  });
});
