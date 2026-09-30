import { vi } from 'vitest';

import { SortOrder } from '../../../../common/enums';
import { EntityNotFoundException } from '../../../../common/errors';
import { ThreadOrigin } from '../../../../generated/prisma';
import { CodingAgentChatsService } from '../../../coding-agent-chats/services/coding-agent-chats.service';
import { createThreadSchema } from '../../dto/create-thread.dto';
import { listThreadsQuerySchema } from '../../dto/list-threads-query.dto';
import { ChatThreadsRepository } from '../../repositories/chat-threads.repository';
import { isCodingAgentOrigin, threadOriginCondition } from '../thread-origin.utility';

// F094: the headless CLI has its own origin, but it shares one history with
// the VS Code extension. These cases pin both halves of that.

describe('coding agent CLI origin', () => {
  it('is accepted when a thread is created', () => {
    const result = createThreadSchema.safeParse({ origin: ThreadOrigin.CODING_AGENT_CLI });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBe(ThreadOrigin.CODING_AGENT_CLI);
  });

  it('is accepted as a list filter', () => {
    const result = listThreadsQuerySchema.safeParse({ origin: 'CODING_AGENT_CLI' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.origin).toBe(ThreadOrigin.CODING_AGENT_CLI);
  });

  it('belongs to the coding agent family, and web does not', () => {
    expect(isCodingAgentOrigin(ThreadOrigin.CODING_AGENT)).toBe(true);
    expect(isCodingAgentOrigin(ThreadOrigin.CODING_AGENT_CLI)).toBe(true);
    expect(isCodingAgentOrigin(ThreadOrigin.WEB)).toBe(false);
  });

  it('keeps web as the default listing, so CLI runs never reach the web chat list', () => {
    expect(threadOriginCondition(undefined)).toBe(ThreadOrigin.WEB);
    expect(threadOriginCondition(ThreadOrigin.WEB)).toBe(ThreadOrigin.WEB);
  });

  it('lists CLI threads in the extension history, and can narrow to the CLI alone', () => {
    expect(threadOriginCondition(ThreadOrigin.CODING_AGENT)).toEqual({
      in: [ThreadOrigin.CODING_AGENT, ThreadOrigin.CODING_AGENT_CLI],
    });
    expect(threadOriginCondition(ThreadOrigin.CODING_AGENT_CLI)).toBe(
      ThreadOrigin.CODING_AGENT_CLI,
    );
  });

  it('reaches the repository query for both list and count', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const count = vi.fn().mockResolvedValue(0);
    const repository = new ChatThreadsRepository({ chatThread: { findMany, count } } as never);
    const filters = { userId: 'user-1', origin: ThreadOrigin.CODING_AGENT };

    await repository.findAll(filters, 1, 20, 'updatedAt', SortOrder.DESC);
    await repository.countAll(filters);

    const expected = { in: [ThreadOrigin.CODING_AGENT, ThreadOrigin.CODING_AGENT_CLI] };
    expect(findMany.mock.calls[0]?.[0].where.origin).toEqual(expected);
    expect(count.mock.calls[0]?.[0].where.origin).toEqual(expected);
  });

  it('lets the coding agent transcript endpoint read a CLI thread, and still refuses web', async () => {
    const findById = vi.fn();
    const findAllByThreadIdAscending = vi.fn().mockResolvedValue([{ id: 'm1' }]);
    const service = new CodingAgentChatsService(
      { findById } as never,
      { findAllByThreadIdAscending } as never,
    );

    findById.mockResolvedValueOnce({ userId: 'u1', origin: ThreadOrigin.CODING_AGENT_CLI });
    await expect(service.getMessages('u1', 't1', 50)).resolves.toEqual([{ id: 'm1' }]);

    findById.mockResolvedValueOnce({ userId: 'u1', origin: ThreadOrigin.WEB });
    await expect(service.getMessages('u1', 't1', 50)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );

    findById.mockResolvedValueOnce({ userId: 'u2', origin: ThreadOrigin.CODING_AGENT_CLI });
    await expect(service.getMessages('u1', 't1', 50)).rejects.toBeInstanceOf(
      EntityNotFoundException,
    );
  });
});
