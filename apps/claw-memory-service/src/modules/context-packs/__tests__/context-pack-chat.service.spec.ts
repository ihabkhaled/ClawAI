import { vi } from 'vitest';
import { ContextPackItemType } from '../../../generated/prisma';
import { ContextPackChatService } from '../services/context-pack-chat.service';
import { ContextPacksRepository } from '../repositories/context-packs.repository';
import { type ContextPacksService } from '../services/context-packs.service';

import type { PrismaService } from '../../../infrastructure/database/prisma/prisma.service';

function build(options: {
  addItem?: ReturnType<typeof vi.fn>;
  findMany?: ReturnType<typeof vi.fn>;
}): {
  service: ContextPackChatService;
  addItem: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
} {
  const findMany = options.findMany ?? vi.fn().mockResolvedValue([]);
  const prisma = {
    contextPack: {
      findMany,
      findUnique: vi.fn().mockResolvedValue({ id: 'pack-1', name: 'Trip notes', items: [] }),
    },
  } as unknown as PrismaService;
  const addItem = options.addItem ?? vi.fn().mockResolvedValue({ id: 'item-1' });
  const packs = { addItem } as unknown as ContextPacksService;
  return {
    service: new ContextPackChatService(new ContextPacksRepository(prisma), packs),
    addItem,
    findMany,
  };
}

describe('ContextPackChatService (ADR-133)', () => {
  it("lists only the asking user's packs, newest first, bounded", async () => {
    const findMany = vi
      .fn()
      .mockResolvedValue([
        { id: 'p1', name: 'Trip notes', updatedAt: new Date('2026-09-29'), _count: { items: 3 } },
      ]);
    const { service } = build({ findMany });

    const options = await service.listOptions('user-1');

    expect(options).toEqual([
      { id: 'p1', name: 'Trip notes', updatedAt: new Date('2026-09-29'), itemCount: 3 },
    ]);
    const query = findMany.mock.calls[0]?.[0] as { where: unknown; orderBy: unknown; take: number };
    expect(query.where).toEqual({ userId: 'user-1' });
    expect(query.orderBy).toEqual({ updatedAt: 'desc' });
    expect(query.take).toBe(50);
  });

  it('adds a MARKDOWN item through the owner-checked addItem, as the asking user', async () => {
    const { service, addItem } = build({});

    const result = await service.addItemFromChat('pack-1', {
      userId: 'user-1',
      content: '## Paris plan',
      sourceMessageId: 'msg-1',
    });

    expect(addItem).toHaveBeenCalledWith('pack-1', 'user-1', {
      itemType: ContextPackItemType.MARKDOWN,
      content: '## Paris plan',
    });
    expect(result).toEqual({ packId: 'pack-1', itemId: 'item-1', name: 'Trip notes' });
  });

  it("refuses someone else's pack — the ownership error from addItem propagates", async () => {
    const addItem = vi.fn().mockRejectedValue(new Error('FORBIDDEN_CONTEXT_PACK_ACCESS'));
    const { service } = build({ addItem });

    await expect(
      service.addItemFromChat('pack-x', { userId: 'user-1', content: 'x', sourceMessageId: 'm' }),
    ).rejects.toThrow('FORBIDDEN_CONTEXT_PACK_ACCESS');
  });

  it('returns the existing item when the same text is already in the pack (regenerate)', async () => {
    const addItem = vi.fn();
    const prisma = {
      contextPack: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ id: 'pack-1', name: 'Trips', userId: 'user-1', items: [] }),
      },
      contextPackItem: { findFirst: vi.fn().mockResolvedValue({ id: 'item-9' }) },
    } as unknown as PrismaService;
    const service = new ContextPackChatService(new ContextPacksRepository(prisma), {
      addItem,
    } as unknown as ContextPacksService);

    const result = await service.addItemFromChat('pack-1', {
      userId: 'user-1',
      content: '## Paris plan',
      sourceMessageId: 'msg-1',
    });

    expect(result).toEqual({ packId: 'pack-1', itemId: 'item-9', name: 'Trips' });
    expect(addItem).not.toHaveBeenCalled();
  });
});
