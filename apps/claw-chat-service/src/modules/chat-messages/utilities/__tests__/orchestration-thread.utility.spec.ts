import { describe, expect, it, vi } from 'vitest';

import { type ChatThread } from '../../../../generated/prisma';
import { type ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';
import {
  orchestrationThreadTitle,
  resolveOrchestrationThread,
} from '../orchestration-thread.utility';

function makeRepository(existing: Partial<ChatThread> | null): {
  repository: ChatThreadsRepository;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({ id: 'new-thread', userId: 'u1' });
  const repository = {
    findById: vi.fn().mockResolvedValue(existing),
    create,
  } as unknown as ChatThreadsRepository;
  return { repository, create };
}

describe('resolveOrchestrationThread', () => {
  it('creates a thread carrying the context packs', async () => {
    const { repository, create } = makeRepository(null);
    const thread = await resolveOrchestrationThread(repository, 'u1', {
      title: 'Verify: hi',
      routingMode: 'AUTO',
      contextPackIds: ['p1', 'p2'],
    });
    expect(thread.id).toBe('new-thread');
    expect(create).toHaveBeenCalledWith({
      userId: 'u1',
      title: 'Verify: hi',
      routingMode: 'AUTO',
      contextPackIds: ['p1', 'p2'],
    });
  });

  it('omits contextPackIds when none were picked', async () => {
    const { repository, create } = makeRepository(null);
    await resolveOrchestrationThread(repository, 'u1', {
      title: 't',
      routingMode: 'MANUAL_MODEL',
      contextPackIds: [],
    });
    expect(create).toHaveBeenCalledWith({ userId: 'u1', title: 't', routingMode: 'MANUAL_MODEL' });
  });

  it('reuses the caller own thread', async () => {
    const { repository, create } = makeRepository({ id: 't1', userId: 'u1' });
    const thread = await resolveOrchestrationThread(repository, 'u1', {
      threadId: 't1',
      title: 't',
      routingMode: 'AUTO',
    });
    expect(thread.id).toBe('t1');
    expect(create).not.toHaveBeenCalled();
  });

  it("refuses another user's thread", async () => {
    const { repository } = makeRepository({ id: 't1', userId: 'someone-else' });
    await expect(
      resolveOrchestrationThread(repository, 'u1', {
        threadId: 't1',
        title: 't',
        routingMode: 'AUTO',
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN_THREAD_ACCESS' });
  });

  it('reports a missing thread', async () => {
    const { repository } = makeRepository(null);
    await expect(
      resolveOrchestrationThread(repository, 'u1', {
        threadId: 'gone',
        title: 't',
        routingMode: 'AUTO',
      }),
    ).rejects.toThrow();
  });
});

describe('orchestrationThreadTitle', () => {
  it('prefixes the label and keeps fifty characters', () => {
    expect(orchestrationThreadTitle('Compare', 'x'.repeat(80))).toBe(`Compare: ${'x'.repeat(50)}`);
    expect(orchestrationThreadTitle('Repair', undefined)).toBe('Repair: ');
  });
});
