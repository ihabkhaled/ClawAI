import { type Mock, vi } from 'vitest';
import { ContextPackItemType, ContextPackScope } from '../../../generated/prisma';
import { ContextPacksService } from '../services/context-packs.service';
import { ContextPacksRepository } from '../repositories/context-packs.repository';
import { packsForChatSchema } from '../dto/packs-for-chat.dto';
import { addContextPackItemSchema } from '../dto/add-context-pack-item.dto';
import { CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS } from '../../../common/constants/content-limits.constants';

function pack(id: string, items: Array<{ id: string; content: string | null }>) {
  return {
    id,
    name: `Pack ${id}`,
    items: items.map((item) => ({ ...item, itemType: ContextPackItemType.MARKDOWN })),
  };
}

describe('ContextPacksService.getPacksForChat (owner bug 4)', () => {
  let findForChat: Mock;
  let service: ContextPacksService;

  beforeEach(() => {
    findForChat = vi.fn();
    service = new ContextPacksService(
      { findForChat } as unknown as ContextPacksRepository,
      { publish: vi.fn() } as never,
      { embedItem: vi.fn() } as never,
      { resolve: vi.fn() } as never,
    );
  });

  it('returns auto-applied packs even when the thread attached none', async () => {
    findForChat.mockResolvedValue([pack('p1', [{ id: 'i1', content: '# Spec' }])]);
    const bundle = await service.getPacksForChat(
      packsForChatSchema.parse({ userId: 'u1', threadId: 't1' }),
    );
    expect(findForChat).toHaveBeenCalledWith('u1', [], 't1', expect.any(Date), 20);
    expect(bundle.packs).toEqual([
      {
        id: 'p1',
        name: 'Pack p1',
        autoApplied: true,
        items: [{ id: 'i1', itemType: ContextPackItemType.MARKDOWN, content: '# Spec' }],
      },
    ]);
  });

  it('marks thread-attached packs as explicit and drops empty items and empty packs', async () => {
    findForChat.mockResolvedValue([
      pack('p1', [
        { id: 'i1', content: 'body' },
        { id: 'i2', content: '   ' },
        { id: 'i3', content: null },
      ]),
      pack('p2', [{ id: 'i4', content: '' }]),
    ]);
    const bundle = await service.getPacksForChat(
      packsForChatSchema.parse({ userId: 'u1', packIds: ['p1'] }),
    );
    expect(bundle.packs).toHaveLength(1);
    expect(bundle.packs[0]?.autoApplied).toBe(false);
    expect(bundle.packs[0]?.items.map((item) => item.id)).toEqual(['i1']);
  });
});

describe('ContextPacksRepository.findForChat (owner bug 6 — isolation)', () => {
  it('always filters by userId, enabled, and not paused', async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const repo = new ContextPacksRepository({ contextPack: { findMany } } as never);
    const now = new Date('2026-09-29T00:00:00Z');
    await repo.findForChat('owner', ['other-users-pack'], 'thread-9', now, 20);
    const args = findMany.mock.calls[0]?.[0] as {
      where: { userId: string; isEnabled: boolean; AND: Array<{ OR: object[] }> };
      take: number;
    };
    expect(args.where.userId).toBe('owner');
    expect(args.where.isEnabled).toBe(true);
    expect(args.take).toBe(20);
    expect(args.where.AND[0]?.OR).toEqual([
      { scope: ContextPackScope.USER },
      { id: { in: ['other-users-pack'] } },
      { scope: ContextPackScope.THREAD, scopeRef: 'thread-9' },
    ]);
  });
});

describe('pack DTO limits (owner bug 3)', () => {
  it('accepts a 250K item and rejects one character more', () => {
    expect(CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS).toBeGreaterThanOrEqual(250_000);
    const ok = 'x'.repeat(CONTEXT_PACK_ITEM_CONTENT_MAX_CHARS);
    expect(addContextPackItemSchema.safeParse({ content: ok }).success).toBe(true);
    expect(addContextPackItemSchema.safeParse({ content: `${ok}x` }).success).toBe(false);
  });

  it('caps the for-chat request at 20 pack ids', () => {
    const ids = Array.from({ length: 21 }, (_, index) => `p${String(index)}`);
    expect(packsForChatSchema.safeParse({ userId: 'u', packIds: ids }).success).toBe(false);
  });
});
