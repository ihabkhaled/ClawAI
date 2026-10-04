import { describe, expect, it, vi } from 'vitest';

import type { ChatThreadsRepository } from '../../repositories/chat-threads.repository';
import { ThreadSnapshotService } from '../thread-snapshot.service';

describe('ThreadSnapshotService', () => {
  it('uses owner-scoped source lookup and returns a private stable snapshot', async () => {
    const repository = {
      findOwnedSnapshotThread: vi.fn().mockResolvedValue({
        thread: {
          id: 'thread-1',
          title: 'Research',
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
        },
        messages: [
          {
            id: 'message-1',
            role: 'USER',
            content: 'Question',
            createdAt: new Date('2026-10-01T12:00:00.000Z'),
            metadata: null,
          },
        ],
      }),
    };
    const service = new ThreadSnapshotService(repository as unknown as ChatThreadsRepository);

    const result = await service.create('owner-1', 'thread-1');

    expect(repository.findOwnedSnapshotThread).toHaveBeenCalledWith('owner-1', 'thread-1', 2001);
    expect(result.messages[0]?.content).toBe('Question');
  });

  it('does not disclose whether a missing or another owner’s thread exists', async () => {
    const repository = { findOwnedSnapshotThread: vi.fn().mockResolvedValue(null) };
    const service = new ThreadSnapshotService(repository as unknown as ChatThreadsRepository);

    await expect(service.create('owner-2', 'thread-1')).rejects.toMatchObject({ status: 404 });
  });

  it('refuses an over-limit transcript without returning a partial snapshot', async () => {
    const repository = {
      findOwnedSnapshotThread: vi.fn().mockResolvedValue({
        thread: { id: 'thread-1', title: null, createdAt: new Date() },
        messages: Array.from({ length: 2001 }, (_, index) => ({
          id: `message-${String(index)}`,
          role: 'USER',
          content: 'Question',
          createdAt: new Date(),
          metadata: null,
        })),
      }),
    };
    const service = new ThreadSnapshotService(repository as unknown as ChatThreadsRepository);

    await expect(service.create('owner-1', 'thread-1')).rejects.toMatchObject({ status: 400 });
  });
});
