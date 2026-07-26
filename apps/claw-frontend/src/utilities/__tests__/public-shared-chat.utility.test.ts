import { describe, expect, it } from 'vitest';

import { ChatShareVisibility } from '@/enums/chat-share.enum';
import { Locale } from '@/enums/locale.enum';
import { MessageRole } from '@/enums/message-role.enum';
import type { PublicChatShare } from '@/types/chat-share.types';

import {
  buildSharePath,
  buildSharedChatMetadata,
  buildSharedChatViewModel,
  formatPublicDate,
  resolveInlineAdIndex,
} from '../public-shared-chat.utility';

const SITE_URL = 'https://claw.example';

// Identity translator: these assertions are about which key is chosen and how
// the pieces fit together, not about the wording of any locale.
function t(key: string, params?: Record<string, string | number>): string {
  return params === undefined ? key : `${key}:${JSON.stringify(params)}`;
}

function makeShare(overrides: Partial<PublicChatShare> = {}): PublicChatShare {
  return {
    publicShareId: 'AbCdEfGhIjKlMnOpQrStUv',
    title: 'Setting up production infrastructure',
    description: 'A conversation about deploying a service.',
    publishedAt: '2026-07-01T10:00:00.000Z',
    updatedAt: '2026-07-05T12:30:00.000Z',
    snapshotVersion: 2,
    messageCount: 4,
    adsEligible: true,
    indexEligible: true,
    contentLocale: Locale.EN,
    visibility: ChatShareVisibility.PUBLIC_INDEXED,
    messages: [
      {
        id: 'p1',
        sequence: 1,
        role: MessageRole.USER,
        content: 'How do I deploy this?',
        providerLabel: null,
        modelLabel: null,
        createdAt: '2026-07-01T10:00:00.000Z',
      },
    ],
    ...overrides,
  };
}

describe('buildSharePath', () => {
  it('builds the canonical path from the content locale and identifier', () => {
    expect(buildSharePath('AbCdEfGhIjKlMnOpQrStUv', Locale.JA)).toBe(
      '/ja/share/chat/AbCdEfGhIjKlMnOpQrStUv',
    );
  });
});

describe('resolveInlineAdIndex', () => {
  it('returns null for a conversation at or below the threshold', () => {
    // Nothing for an inline unit to sit between, and a top plus bottom unit is
    // already the whole page on a short chat.
    expect(resolveInlineAdIndex(6)).toBeNull();
    expect(resolveInlineAdIndex(1)).toBeNull();
    expect(resolveInlineAdIndex(0)).toBeNull();
  });

  it('places the unit deterministically once the conversation is long enough', () => {
    // Deterministic, not random: a placement that moves between renders is a
    // layout shift on every visit.
    expect(resolveInlineAdIndex(7)).toBe(6);
    expect(resolveInlineAdIndex(50)).toBe(6);
  });
});

describe('buildSharedChatMetadata', () => {
  it('emits noindex and a generic title for an unavailable share', () => {
    // A 404 page carrying the real title would publish exactly what the owner
    // just unpublished.
    const metadata = buildSharedChatMetadata(null, SITE_URL, t);

    expect(metadata.title).toBe('chatShare.public.unavailableTitle');
    expect(metadata.robots).toMatchObject({ index: false, follow: false, noarchive: true });
    expect(metadata.alternates).toBeUndefined();
  });

  it('emits index+follow and a canonical URL for an indexed share', () => {
    const metadata = buildSharedChatMetadata(makeShare(), SITE_URL, t);

    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe(`${SITE_URL}/en/share/chat/AbCdEfGhIjKlMnOpQrStUv`);
  });

  it('emits noindex for an unlisted share even though the path is crawlable', () => {
    // The page-level directive is the ONLY thing keeping an unlisted share out of
    // an index — robots.txt deliberately allows the path.
    const metadata = buildSharedChatMetadata(
      makeShare({ visibility: ChatShareVisibility.PUBLIC_UNLISTED }),
      SITE_URL,
      t,
    );

    expect(metadata.robots).toMatchObject({ index: false, follow: false, noarchive: true });
    expect(metadata.other?.['x-robots-tag']).toBe('noindex, nofollow, noarchive');
  });

  it('omits the x-robots-tag override on an indexed share', () => {
    const metadata = buildSharedChatMetadata(makeShare(), SITE_URL, t);

    expect(metadata.other?.['x-robots-tag']).toBeUndefined();
  });

  it('builds the canonical from the configured origin, never a request host', () => {
    // A spoofed X-Forwarded-Host that became a canonical URL would let an
    // attacker point our canonical at their own domain.
    const metadata = buildSharedChatMetadata(makeShare(), 'https://configured.example', t);

    expect(metadata.alternates?.canonical).toBe(
      'https://configured.example/en/share/chat/AbCdEfGhIjKlMnOpQrStUv',
    );
  });

  it('falls back to a generic description when the content is unsuitable', () => {
    const metadata = buildSharedChatMetadata(makeShare({ description: null }), SITE_URL, t);

    expect(metadata.description).toBe('chatShare.public.genericDescription');
  });
});

describe('buildSharedChatViewModel', () => {
  it('exposes no owner identity anywhere in the view model', () => {
    const view = buildSharedChatViewModel(makeShare(), SITE_URL, t);

    const serialised = JSON.stringify(view);
    expect(serialised).not.toContain('ownerUserId');
    expect(serialised).not.toContain('userId');
    expect(serialised).not.toContain('threadId');
  });

  it('carries the canonical URL into the JSON-LD input', () => {
    const view = buildSharedChatViewModel(makeShare(), SITE_URL, t);

    expect(view.jsonLd.canonicalUrl).toBe(`${SITE_URL}/en/share/chat/AbCdEfGhIjKlMnOpQrStUv`);
    expect(view.jsonLd.publishedAt).toBe('2026-07-01T10:00:00.000Z');
    expect(view.jsonLd.updatedAt).toBe('2026-07-05T12:30:00.000Z');
  });

  it('resolves the pathname the ad units are gated on', () => {
    const view = buildSharedChatViewModel(makeShare(), SITE_URL, t);

    expect(view.pathname).toBe('/en/share/chat/AbCdEfGhIjKlMnOpQrStUv');
  });

  it('has no inline ad slot for a short conversation', () => {
    const view = buildSharedChatViewModel(makeShare(), SITE_URL, t);

    expect(view.messageListProps.inlineAdAfterIndex).toBeNull();
  });
});

describe('formatPublicDate', () => {
  it('formats as a locale-independent ISO date', () => {
    // Locale/timezone formatting would differ between the server render and the
    // client hydration and produce a hydration error on every page load.
    expect(formatPublicDate('2026-07-05T12:30:00.000Z')).toBe('2026-07-05');
  });

  it('returns an empty string for an unparseable timestamp', () => {
    expect(formatPublicDate('not-a-date')).toBe('');
  });
});
