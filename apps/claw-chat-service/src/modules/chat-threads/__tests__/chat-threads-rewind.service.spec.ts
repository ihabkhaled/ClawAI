import { type Mock, vi } from 'vitest';
import { type RabbitMQService } from '@claw/shared-rabbitmq';
import { ChatThreadsService } from '../services/chat-threads.service';
import { type ChatThreadsRepository } from '../repositories/chat-threads.repository';
import { type ChatMessagesRepository } from '../../chat-messages/repositories/chat-messages.repository';
import { type DailyLimitService } from '../../chat-messages/services/daily-limit.service';
import { BusinessException, EntityNotFoundException } from '../../../common/errors';

const ownedThread = { id: 'thread-1', userId: 'user-1' };

function build(): {
  service: ChatThreadsService;
  findById: Mock;
  deleteAfterMessage: Mock;
  publish: Mock;
} {
  const findById = vi.fn().mockResolvedValue(ownedThread);
  const deleteAfterMessage = vi.fn().mockResolvedValue(3);
  const publish = vi.fn().mockResolvedValue(undefined);
  const service = new ChatThreadsService(
    { findById } as unknown as ChatThreadsRepository,
    { deleteAfterMessage } as unknown as ChatMessagesRepository,
    { publish } as unknown as RabbitMQService,
    { resolve: vi.fn() } as unknown as DailyLimitService,
  );
  return { service, findById, deleteAfterMessage, publish };
}

describe('ChatThreadsService.rewindThread', () => {
  it('drops the later messages and reports how many went', async () => {
    const { service, deleteAfterMessage } = build();

    await expect(service.rewindThread('user-1', 'thread-1', 'msg-2')).resolves.toEqual({
      threadId: 'thread-1',
      afterMessageId: 'msg-2',
      removedCount: 3,
    });
    expect(deleteAfterMessage).toHaveBeenCalledWith('thread-1', 'msg-2');
  });

  it('answers zero when the pivot is already the last message', async () => {
    const { service, deleteAfterMessage } = build();
    deleteAfterMessage.mockResolvedValue(0);

    const result = await service.rewindThread('user-1', 'thread-1', 'msg-9');

    expect(result.removedCount).toBe(0);
  });

  it('404s an unknown thread without touching messages', async () => {
    const { service, findById, deleteAfterMessage } = build();
    findById.mockResolvedValue(null);

    await expect(service.rewindThread('user-1', 'missing', 'msg-1')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
    expect(deleteAfterMessage).not.toHaveBeenCalled();
  });

  it('refuses a thread owned by another user without touching messages (IDOR)', async () => {
    const { service, deleteAfterMessage } = build();

    await expect(service.rewindThread('intruder', 'thread-1', 'msg-1')).rejects.toBeInstanceOf(
      BusinessException,
    );
    expect(deleteAfterMessage).not.toHaveBeenCalled();
  });

  it('404s a pivot that belongs to another thread', async () => {
    const { service, deleteAfterMessage } = build();
    deleteAfterMessage.mockResolvedValue(null);

    await expect(service.rewindThread('user-1', 'thread-1', 'foreign')).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });

  it('publishes no event, matching whole-thread deletion', async () => {
    const { service, publish } = build();

    await service.rewindThread('user-1', 'thread-1', 'msg-2');

    expect(publish).not.toHaveBeenCalled();
  });
});
