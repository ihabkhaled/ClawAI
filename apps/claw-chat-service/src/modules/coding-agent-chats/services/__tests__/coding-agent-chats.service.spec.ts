import { vi } from 'vitest';
import { CodingAgentChatsService } from '../coding-agent-chats.service';
import { EntityNotFoundException } from '../../../../common/errors';
import { SortOrder } from '../../../../common/enums';
import { ThreadOrigin } from '../../../../generated/prisma';

import type { ChatMessagesRepository } from '../../../chat-messages/repositories/chat-messages.repository';
import type { ChatThreadsRepository } from '../../../chat-threads/repositories/chat-threads.repository';

const query = {
  page: 1,
  limit: 20,
  sortBy: 'updatedAt' as const,
  sortOrder: SortOrder.DESC,
};

function threadsRepository(thread: unknown): ChatThreadsRepository {
  return {
    findAll: vi.fn().mockResolvedValue([]),
    countAll: vi.fn().mockResolvedValue(0),
    findById: vi.fn().mockResolvedValue(thread),
  } as unknown as ChatThreadsRepository;
}

function messagesRepository(): ChatMessagesRepository {
  return {
    findAllByThreadIdAscending: vi.fn().mockResolvedValue([{ id: 'm1' }]),
  } as unknown as ChatMessagesRepository;
}

describe('CodingAgentChatsService', () => {
  it('asks only for the coding agent origin, never for every thread', async () => {
    const threads = threadsRepository(null);
    const service = new CodingAgentChatsService(threads, messagesRepository());

    await service.getThreads('user-1', query);

    // The filter is the whole separation. A list built without it would show
    // the user's own web conversations on the coding agent page.
    expect(threads.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', origin: ThreadOrigin.CODING_AGENT }),
      1,
      20,
      'updatedAt',
      SortOrder.DESC,
    );
  });

  it('reads a coding agent thread oldest message first', async () => {
    const messages = messagesRepository();
    const service = new CodingAgentChatsService(
      threadsRepository({ id: 't1', userId: 'user-1', origin: ThreadOrigin.CODING_AGENT }),
      messages,
    );

    const result = await service.getMessages('user-1', 't1', 50);

    expect(messages.findAllByThreadIdAscending).toHaveBeenCalledWith('t1', 50);
    expect(result).toEqual([{ id: 'm1' }]);
  });

  it('refuses a web conversation reached through the coding agent endpoint', async () => {
    // Otherwise this endpoint becomes a second, unfiltered way to read every
    // conversation the user has.
    const service = new CodingAgentChatsService(
      threadsRepository({ id: 't1', userId: 'user-1', origin: ThreadOrigin.WEB }),
      messagesRepository(),
    );

    await expect(service.getMessages('user-1', 't1', 50)).rejects.toThrow(EntityNotFoundException);
  });

  it("refuses another user's coding agent thread", async () => {
    const service = new CodingAgentChatsService(
      threadsRepository({ id: 't1', userId: 'someone-else', origin: ThreadOrigin.CODING_AGENT }),
      messagesRepository(),
    );

    await expect(service.getMessages('user-1', 't1', 50)).rejects.toThrow(EntityNotFoundException);
  });

  it('answers a missing thread the same way it answers a forbidden one', async () => {
    // Identical refusals are what stop this being used to learn which thread
    // ids exist.
    const service = new CodingAgentChatsService(threadsRepository(null), messagesRepository());

    await expect(service.getMessages('user-1', 'nope', 50)).rejects.toThrow(
      EntityNotFoundException,
    );
  });
});
