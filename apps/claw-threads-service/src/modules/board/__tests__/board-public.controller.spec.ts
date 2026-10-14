import 'reflect-metadata';
import { IS_PUBLIC_KEY } from '@claw/shared-auth';
import type { AuthenticatedUser } from '@claw/shared-types';
import { describe, expect, it, vi } from 'vitest';

import { BoardController } from '../controllers/board.controller';
import { BoardPublicController } from '../controllers/board-public.controller';
import type { BoardRepository } from '../repositories/board.repository';
import { BoardService } from '../services/board.service';
import type { BoardRow } from '../types/board.types';

const HEADERS_KEY = '__headers__';
const LIMIT_KEY = 'THROTTLER:LIMITdefault';
const TTL_KEY = 'THROTTLER:TTLdefault';

const row: BoardRow = {
  slug: 'a',
  ownerId: 'owner-1',
  title: 'Kubernetes Guide',
  excerpt: 'e',
  contentLocale: 'en',
  publicationType: 'guide',
  publishedAt: new Date('2026-01-02T00:00:00Z'),
  readingMinutes: 3,
  sourceCount: 2,
  likeCount: 1,
  commentCount: 0,
  viewCount: 9,
  viewerReaction: null,
};

function service(rows: BoardRow[]): { board: BoardService; list: ReturnType<typeof vi.fn> } {
  const list = vi.fn().mockResolvedValue(rows);
  const repo = {
    list,
    count: vi.fn().mockResolvedValue(rows.length),
    suggest: vi.fn().mockResolvedValue(rows),
    suggestCount: vi.fn().mockResolvedValue(rows.length),
    closestWords: vi.fn().mockResolvedValue([]),
  } as unknown as BoardRepository;
  return {
    board: new BoardService(repo, { resolveMany: vi.fn().mockResolvedValue(new Map()) } as never),
    list,
  };
}

const query = { sort: 'latest', lang: 'all', type: 'all', page: 1, limit: 12 } as const;
const user = { id: 'u1' } as AuthenticatedUser;

function headersOf(proto: object, method: string): Record<string, string> {
  const handler = (proto as Record<string, unknown>)[method];
  const list = Reflect.getMetadata(HEADERS_KEY, handler as object) as {
    name: string;
    value: string;
  }[];
  return Object.fromEntries(list.map((h) => [h.name, h.value]));
}

describe('BoardPublicController', () => {
  it('is public and answers a guest with no viewer data', async () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, BoardPublicController)).toBe(true);
    const { board, list } = service([row]);
    const result = await new BoardPublicController(board).list(query);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.viewerReaction).toBeNull();
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ userId: null }));
  });

  it('answers with exactly the keys the signed-in Board answers with', async () => {
    const { board } = service([row]);
    const guest = await new BoardPublicController(board).list(query);
    const member = await new BoardController(board).list(user, query);
    expect(Object.keys(guest)).toEqual(Object.keys(member));
    expect(Object.keys(guest.items[0] ?? {})).toEqual(Object.keys(member.items[0] ?? {}));
    expect(Object.keys(guest.meta)).toEqual(Object.keys(member.meta));
    const guestSuggest = await new BoardPublicController(board).suggest({ q: 'ku', lang: 'all' });
    const memberSuggest = await new BoardController(board).suggest({ q: 'ku', lang: 'all' });
    expect(Object.keys(guestSuggest)).toEqual(Object.keys(memberSuggest));
  });

  it('exposes no private field on an item', async () => {
    const { board } = service([row]);
    const keys = Object.keys((await new BoardPublicController(board).list(query)).items[0] ?? {});
    for (const forbidden of ['ownerId', 'authorId', 'userId', 'hash', 'safety', 'id']) {
      expect(keys).not.toContain(forbidden);
    }
  });

  it('returns no item when the visible set is empty (unpublished or revoked threads are not indexed)', async () => {
    const { board } = service([]);
    const result = await new BoardPublicController(board).list(query);
    expect(result.items).toEqual([]);
    expect(result.meta.total).toBe(0);
  });

  it('sets shared-cache headers that never vary on Authorization', () => {
    const list = headersOf(BoardPublicController.prototype, 'list');
    const suggest = headersOf(BoardPublicController.prototype, 'suggest');
    expect(list['Cache-Control']).toBe('public, s-maxage=60, stale-while-revalidate=30');
    expect(suggest['Cache-Control']).toBe('public, s-maxage=30');
    expect(list['Vary']).toBe('Accept-Language');
    expect(suggest['Vary']).toBe('Accept-Language');
  });

  it('throttles per address at 60 and 40 a minute, stricter than the signed-in Board', () => {
    const proto = BoardPublicController.prototype;
    expect(Reflect.getMetadata(LIMIT_KEY, proto.list)).toBe(60);
    expect(Reflect.getMetadata(LIMIT_KEY, proto.suggest)).toBe(40);
    expect(Reflect.getMetadata(TTL_KEY, proto.list)).toBe(60_000);
    expect(Reflect.getMetadata(LIMIT_KEY, BoardController.prototype.list)).toBeGreaterThan(60);
  });
});
