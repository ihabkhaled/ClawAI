import { describe, expect, it } from 'vitest';

import { BadgeTone } from '@/enums/badge-tone.enum';
import { ChatShareSafetyStatus, ChatShareVisibility } from '@/enums/chat-share.enum';
import type { OwnerChatShare } from '@/types/chat-share.types';

import {
  buildShareMetaDescription,
  formatPublicModelLabel,
  indexingBlockedReasonKey,
  visibilityLabelKey,
  visibilityTone,
} from '../chat-share.utility';

function makeShare(overrides: Partial<OwnerChatShare> = {}): OwnerChatShare {
  return {
    publicShareId: 'AbCdEfGhIjKlMnOpQrStUv',
    publicUrl: 'https://claw.example/share/chat/AbCdEfGhIjKlMnOpQrStUv',
    status: 'ACTIVE' as OwnerChatShare['status'],
    visibility: ChatShareVisibility.PUBLIC_INDEXED,
    safetyStatus: ChatShareSafetyStatus.APPROVED,
    snapshotVersion: 1,
    title: 'Setting up production infrastructure',
    messageCount: 8,
    adsEligible: true,
    publishedAt: '2026-07-01T10:00:00.000Z',
    lastSnapshotAt: '2026-07-01T10:00:00.000Z',
    hasUnpublishedMessages: false,
    ...overrides,
  };
}

describe('visibilityLabelKey', () => {
  it.each([
    [ChatShareVisibility.PRIVATE, 'chatShare.visibility.private'],
    [ChatShareVisibility.PUBLIC_UNLISTED, 'chatShare.visibility.unlisted'],
    [ChatShareVisibility.PUBLIC_INDEXED, 'chatShare.visibility.indexed'],
  ])('maps %s to its own key', (visibility, key) => {
    // Three distinct keys, because the three states mean genuinely different
    // things to the owner and collapsing any two would hide a risk.
    expect(visibilityLabelKey(visibility)).toBe(key);
  });
});

describe('visibilityTone', () => {
  it('does not use SUCCESS for an indexed share', () => {
    // A green "success" badge reads as reassurance, and "this conversation is in
    // Google" is a factual state the owner chose, not a good outcome.
    expect(visibilityTone(ChatShareVisibility.PUBLIC_INDEXED)).toBe(BadgeTone.INFO);
  });

  it('warns on an unlisted share', () => {
    expect(visibilityTone(ChatShareVisibility.PUBLIC_UNLISTED)).toBe(BadgeTone.WARNING);
  });

  it('is neutral on a private share', () => {
    expect(visibilityTone(ChatShareVisibility.PRIVATE)).toBe(BadgeTone.SECONDARY);
  });
});

describe('indexingBlockedReasonKey', () => {
  it('returns null when there is no share yet', () => {
    expect(indexingBlockedReasonKey(null)).toBeNull();
  });

  it('returns null when indexing actually took effect', () => {
    expect(indexingBlockedReasonKey(makeShare())).toBeNull();
  });

  it('blames the safety scan when the snapshot needs review', () => {
    // The remedies differ: a flagged credential needs removing from the
    // conversation, a thin conversation just needs more of it. Reporting the
    // wrong one sends the owner to the wrong fix.
    const share = makeShare({
      visibility: ChatShareVisibility.PUBLIC_UNLISTED,
      safetyStatus: ChatShareSafetyStatus.REQUIRES_REVIEW,
    });
    expect(indexingBlockedReasonKey(share)).toBe('chatShare.blocked.safety');
  });

  it('blames thin content when the snapshot is merely too short', () => {
    const share = makeShare({
      visibility: ChatShareVisibility.PUBLIC_UNLISTED,
      safetyStatus: ChatShareSafetyStatus.PENDING,
      adsEligible: false,
    });
    expect(indexingBlockedReasonKey(share)).toBe('chatShare.blocked.tooShort');
  });
});

describe('buildShareMetaDescription', () => {
  it('returns null for no source', () => {
    expect(buildShareMetaDescription(null)).toBeNull();
  });

  it('returns null for whitespace-only source', () => {
    // The caller then falls back to a generic description rather than emitting an
    // empty one, which a search engine renders as a blank snippet.
    expect(buildShareMetaDescription('   \n  ')).toBeNull();
  });

  it('collapses whitespace so an indented code block does not ruin the snippet', () => {
    expect(buildShareMetaDescription('one\n\n   two\tthree')).toBe('one two three');
  });

  it('leaves a short description untouched', () => {
    expect(buildShareMetaDescription('A short summary.')).toBe('A short summary.');
  });

  it('truncates on a word boundary and marks the elision', () => {
    const source = 'word '.repeat(60);
    const result = buildShareMetaDescription(source);

    expect(result).not.toBeNull();
    expect((result as string).length).toBeLessThanOrEqual(161);
    expect(result as string).toMatch(/…$/u);
    // Never mid-word: a search result ending "configura…" reads as broken.
    expect(result as string).not.toMatch(/wor…$/u);
  });

  it('still truncates when the text has no spaces to break on', () => {
    const result = buildShareMetaDescription('x'.repeat(400));

    expect(result).not.toBeNull();
    expect((result as string).length).toBeLessThanOrEqual(161);
  });
});

describe('formatPublicModelLabel', () => {
  it('joins provider and model', () => {
    expect(formatPublicModelLabel('OpenAI', 'gpt-4o')).toBe('OpenAI · gpt-4o');
  });

  it('falls back to the model alone', () => {
    expect(formatPublicModelLabel(null, 'gpt-4o')).toBe('gpt-4o');
  });

  it('falls back to the provider alone', () => {
    expect(formatPublicModelLabel('OpenAI', null)).toBe('OpenAI');
  });

  it('returns null when there is nothing to show', () => {
    // null rather than '' so the view omits the element instead of rendering a
    // stray separator.
    expect(formatPublicModelLabel(null, null)).toBeNull();
    expect(formatPublicModelLabel('', '')).toBeNull();
  });
});
