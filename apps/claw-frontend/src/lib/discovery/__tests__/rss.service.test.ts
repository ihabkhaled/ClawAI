import { beforeEach, describe, expect, it, vi } from 'vitest';

import { LOCALE_REQUEST_HEADER } from '@/constants/locale-routing.constants';
import { RssFeedKind } from '@/enums/rss-feed-kind.enum';

const { listPublicChatRssEntries } = vi.hoisted(() => ({
  listPublicChatRssEntries: vi.fn(),
}));

vi.mock('@/lib/chat-shares/public-chat-share.service', () => ({
  listPublicChatRssEntries,
}));
vi.mock('@/lib/site/site-config', () => ({
  getSiteUrl: (): string => 'https://claw.example',
  shouldNoIndexEverything: (): boolean => false,
}));
// This file unit-tests the CHATS-kind mechanics themselves (ordering, ETag,
// degradation) — behavior that only runs once the AdSense review lockdown is
// lifted. The lockdown-engaged behavior (chat feed never called, always
// empty) is covered at the route level in app/__tests__/rss.test.ts.
vi.mock('@/constants/chat-share-review-lockdown.constants', () => ({
  CHAT_SHARE_REVIEW_LOCKDOWN_ENABLED: false,
}));

function feedRequest(): Request {
  return new Request('https://claw.example/en/feed.xml', {
    headers: { [LOCALE_REQUEST_HEADER]: 'en' },
  });
}

describe('buildLocalizedRssResponse failure behavior', () => {
  beforeEach(() => {
    listPublicChatRssEntries.mockReset();
  });

  it('keeps topic feeds available without calling the chat service', async () => {
    const { buildLocalizedRssResponse } = await import('@/lib/discovery/rss.service');
    const response = await buildLocalizedRssResponse(feedRequest(), RssFeedKind.TOPICS);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/rss+xml; charset=utf-8');
    expect(await response.text()).toContain('https://claw.example/en/features');
    expect(listPublicChatRssEntries).not.toHaveBeenCalled();
  });

  it('returns a controlled temporary failure for an unavailable chat-only feed', async () => {
    listPublicChatRssEntries.mockResolvedValue(null);
    const { buildLocalizedRssResponse } = await import('@/lib/discovery/rss.service');
    const response = await buildLocalizedRssResponse(feedRequest(), RssFeedKind.CHATS);

    expect(response.status).toBe(503);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('retry-after')).toBe('30');
    expect(response.headers.get('x-claw-discovery-degraded')).toBe('chat-feed-unavailable');
  });

  it('serves bounded topic content with a short degraded cache for combined feeds', async () => {
    listPublicChatRssEntries.mockResolvedValue(null);
    const { buildLocalizedRssResponse } = await import('@/lib/discovery/rss.service');
    const response = await buildLocalizedRssResponse(feedRequest(), RssFeedKind.COMBINED);
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('s-maxage=30');
    expect(response.headers.get('x-claw-discovery-degraded')).toBe('chat-feed-unavailable');
    expect(xml).toContain('https://claw.example/en/features');
  });

  it('orders chat items newest first without truncating eligible entries', async () => {
    listPublicChatRssEntries.mockResolvedValue(
      Array.from({ length: 101 }, (_, index) => ({
        publicShareId: `share-${index}`,
        contentLocale: 'en',
        title: `Chat ${index}`,
        description: null,
        publishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
        updatedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(),
      })),
    );
    const { buildLocalizedRssResponse } = await import('@/lib/discovery/rss.service');
    const response = await buildLocalizedRssResponse(feedRequest(), RssFeedKind.CHATS);
    const xml = await response.text();

    expect(xml.match(/<item>/gu)).toHaveLength(101);
    expect(xml.indexOf('<title>Chat 100</title>')).toBeLessThan(
      xml.indexOf('<title>Chat 99</title>'),
    );
    expect(xml).toContain('<title>Chat 0</title>');
  });

  it('honors an exact ETag validator', async () => {
    listPublicChatRssEntries.mockResolvedValue([]);
    const { buildLocalizedRssResponse } = await import('@/lib/discovery/rss.service');
    const first = await buildLocalizedRssResponse(feedRequest(), RssFeedKind.CHATS);
    const etag = first.headers.get('etag');
    expect(etag).not.toBeNull();

    const conditionalRequest = new Request('https://claw.example/en/feeds/chats.xml', {
      headers: {
        [LOCALE_REQUEST_HEADER]: 'en',
        'If-None-Match': etag ?? '',
      },
    });
    const second = await buildLocalizedRssResponse(conditionalRequest, RssFeedKind.CHATS);

    expect(second.status).toBe(304);
    expect(second.headers.get('etag')).toBe(etag);
  });
});
