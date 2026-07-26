import { describe, expect, it } from 'vitest';

import { asOwnerChatShare } from '../owner-chat-share.utility';

// Regression cover for a shipped bug: the share dialog showed its PUBLISHED state
// — public-link field, "Version 0", "0 messages", Stop sharing — for threads that
// had never been shared, and every button then failed with "ChatShare not found".
//
// Cause: "no share" does not arrive as `null`. A NestJS controller returning
// `null` sends an empty body, axios parses that as `''`, and `'' ?? null` is `''`
// — which survives a `=== null` check.

describe('asOwnerChatShare', () => {
  it('treats an empty string as no share', () => {
    // The exact value axios produces for a 200 with an empty body. This single
    // case is the whole bug.
    expect(asOwnerChatShare('')).toBeNull();
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['an empty object', {}],
    ['a number', 0],
    ['the string "null"', 'null'],
    ['an array', []],
    ['a boolean', false],
  ])('treats %s as no share', (_label, payload) => {
    expect(asOwnerChatShare(payload)).toBeNull();
  });

  it('rejects an object whose publicShareId is empty', () => {
    // A share without an identifier cannot be opened, so it is not a share.
    expect(asOwnerChatShare({ publicShareId: '', messageCount: 4 })).toBeNull();
  });

  it('rejects an object whose publicShareId is not a string', () => {
    expect(asOwnerChatShare({ publicShareId: 123 })).toBeNull();
  });

  it('accepts a real share and returns it unchanged', () => {
    const share = {
      publicShareId: 'AbCdEfGhIjKlMnOpQrStUv',
      publicUrl: 'https://claw.example/share/chat/AbCdEfGhIjKlMnOpQrStUv',
      snapshotVersion: 2,
      messageCount: 8,
    };

    expect(asOwnerChatShare(share)).toBe(share);
  });

  it('accepts a share carrying fields the frontend does not know about', () => {
    // Keying on one required field rather than validating the whole shape means a
    // field added by the backend cannot make valid payloads start failing.
    const share = { publicShareId: 'AbCdEfGhIjKlMnOpQrStUv', somethingNew: true };

    expect(asOwnerChatShare(share)).not.toBeNull();
  });
});
