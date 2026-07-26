import { describe, expect, it } from 'vitest';

import { ChatShareErrorCode } from '@/enums/chat-share-error-code.enum';
import { resolveChatShareErrorKey } from '@/utilities/chat-share-error.utility';

const FALLBACK = 'chatShare.toast.publishFailed';

describe('resolveChatShareErrorKey', () => {
  it.each([
    [ChatShareErrorCode.EmptyThread, 'chatShare.errors.emptyThread'],
    [ChatShareErrorCode.ShareNotFound, 'chatShare.errors.shareNotFound'],
    [ChatShareErrorCode.InvalidShareId, 'chatShare.errors.invalidShareId'],
  ])('maps %s to its own message', (code, expected) => {
    expect(resolveChatShareErrorKey({ code }, FALLBACK)).toBe(expected);
  });

  /**
   * Anything unrecognised must stay generic. Guessing at an unknown code is
   * worse than the fallback: telling somebody their chat is empty when it is not
   * sends them looking for the wrong problem.
   */
  it.each([
    ['a code added after this build', { code: 'SOME_FUTURE_CODE' }],
    ['a network error with no code', new Error('Network request failed')],
    ['a non-string code', { code: 42 }],
    ['null', null],
    ['undefined', undefined],
    ['a bare string', 'boom'],
    ['an empty object', {}],
  ])('falls back for %s', (_label, error) => {
    expect(resolveChatShareErrorKey(error, FALLBACK)).toBe(FALLBACK);
  });

  /**
   * The backend sends the untranslated key as `message`. Reading it would print
   * `chat.share.errors.EMPTY_THREAD` to the user, so only `code` is consulted.
   */
  it('ignores the message and reads only the code', () => {
    const error = {
      code: ChatShareErrorCode.EmptyThread,
      message: 'chat.share.errors.EMPTY_THREAD',
    };

    expect(resolveChatShareErrorKey(error, FALLBACK)).toBe('chatShare.errors.emptyThread');
  });
});
