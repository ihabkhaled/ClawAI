import { afterEach, describe, expect, it, vi } from 'vitest';

import { THREAD_VIEWER_REACTION_STORAGE_PREFIX } from '@/constants/thread-publication.constants';
import { ThreadPublicationReaction } from '@/enums/thread-publication-reaction.enum';
import type { ThreadReactionSummary } from '@/types/thread-publication.types';

import {
  readRememberedReaction,
  rememberReaction,
  withRememberedReaction,
} from '../thread-viewer-reaction.utility';

const SUMMARY: ThreadReactionSummary = { likes: 3, dislikes: 1, viewerReaction: null };

describe('remembered viewer reaction', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('remembers a like per user and Thread, and reads it back', () => {
    rememberReaction('user-1', 'slug-a', ThreadPublicationReaction.Like);

    expect(readRememberedReaction('user-1', 'slug-a')).toBe(ThreadPublicationReaction.Like);
    expect(readRememberedReaction('user-1', 'slug-b')).toBeNull();
    expect(readRememberedReaction('user-2', 'slug-a')).toBeNull();
  });

  it('forgets the reaction when the person removes it', () => {
    rememberReaction('user-1', 'slug-a', ThreadPublicationReaction.Dislike);
    rememberReaction('user-1', 'slug-a', null);

    expect(readRememberedReaction('user-1', 'slug-a')).toBeNull();
    expect(
      window.localStorage.getItem(`${THREAD_VIEWER_REACTION_STORAGE_PREFIX}user-1:slug-a`),
    ).toBe(null);
  });

  it('ignores a stored value that is not a known reaction', () => {
    window.localStorage.setItem(`${THREAD_VIEWER_REACTION_STORAGE_PREFIX}user-1:slug-a`, 'LOVE');

    expect(readRememberedReaction('user-1', 'slug-a')).toBeNull();
  });

  it('survives blocked storage on read and on write', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(readRememberedReaction('user-1', 'slug-a')).toBeNull();
    expect(() =>
      rememberReaction('user-1', 'slug-a', ThreadPublicationReaction.Like),
    ).not.toThrow();
    expect(() => rememberReaction('user-1', 'slug-a', null)).not.toThrow();
  });
});

describe('withRememberedReaction', () => {
  it('fills the null the public endpoint returns with the remembered reaction', () => {
    expect(withRememberedReaction(SUMMARY, ThreadPublicationReaction.Like)).toEqual({
      ...SUMMARY,
      viewerReaction: ThreadPublicationReaction.Like,
    });
  });

  it('never overrides a real answer from the service', () => {
    const fromService = { ...SUMMARY, viewerReaction: ThreadPublicationReaction.Dislike };

    expect(withRememberedReaction(fromService, ThreadPublicationReaction.Like)).toBe(fromService);
  });

  it('leaves the summary alone when nothing is remembered or nothing has loaded', () => {
    expect(withRememberedReaction(SUMMARY, null)).toBe(SUMMARY);
    expect(withRememberedReaction(undefined, ThreadPublicationReaction.Like)).toBeUndefined();
  });

  it('keeps the counts untouched', () => {
    const merged = withRememberedReaction(SUMMARY, ThreadPublicationReaction.Like);

    expect(merged?.likes).toBe(3);
    expect(merged?.dislikes).toBe(1);
  });
});
