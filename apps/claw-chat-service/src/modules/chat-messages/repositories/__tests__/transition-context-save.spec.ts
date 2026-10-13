import { vi } from 'vitest';
import { ChatMessagesRepository } from '../chat-messages.repository';

import type { PrismaService } from '../../../../infrastructure/database/prisma/prisma.service';

function build(count: number): {
  repository: ChatMessagesRepository;
  updateMany: ReturnType<typeof vi.fn>;
} {
  const updateMany = vi.fn().mockResolvedValue({ count });
  const prisma = { chatMessage: { updateMany } } as unknown as PrismaService;
  return { repository: new ChatMessagesRepository(prisma), updateMany };
}

describe('ChatMessagesRepository.transitionContextSave', () => {
  it('claims on the status alone by default', async () => {
    const { repository, updateMany } = build(1);

    await expect(repository.transitionContextSave('m1', 'PROPOSED', { next: true })).resolves.toBe(
      true,
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        AND: [{ metadata: { path: ['contextSave', 'status'], equals: 'PROPOSED' } }],
      },
      data: { metadata: { next: true } },
    });
  });

  it('takes over an abandoned claim only for the caller that saw that claim time', async () => {
    const { repository, updateMany } = build(1);

    await repository.transitionContextSave('m1', 'SAVING', { next: true }, '2026-10-13T10:00:00Z');

    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: 'm1',
        AND: [
          { metadata: { path: ['contextSave', 'status'], equals: 'SAVING' } },
          { metadata: { path: ['contextSave', 'savingSince'], equals: '2026-10-13T10:00:00Z' } },
        ],
      },
      data: { metadata: { next: true } },
    });
  });

  it('is false when another caller already moved the record', async () => {
    const { repository } = build(0);

    await expect(repository.transitionContextSave('m1', 'PROPOSED', {})).resolves.toBe(false);
  });
});
