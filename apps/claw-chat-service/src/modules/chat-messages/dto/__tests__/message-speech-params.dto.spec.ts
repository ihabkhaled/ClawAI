import { describe, expect, it } from 'vitest';

import { messageSpeechParamsSchema } from '../message-speech-params.dto';

// Multimodal batch 9 — `POST /chat-messages/:id/speech` params fuzz. The id
// reaches a database read, a stored filename and a PAYG requestId.
describe('messageSpeechParamsSchema', () => {
  it.each([['cmfz1abc0000qwerty12345678'], ['a'], ['A_b-9'], ['x'.repeat(64)]])(
    'accepts %s',
    (id) => {
      expect(messageSpeechParamsSchema.safeParse({ id }).success).toBe(true);
    },
  );

  it.each([
    ['an empty id', { id: '' }],
    ['an over-long id', { id: 'x'.repeat(65) }],
    ['a path traversal', { id: '../etc/passwd' }],
    ['a slash', { id: 'a/b' }],
    ['a colon (requestId separator)', { id: 'a:b' }],
    ['whitespace', { id: 'a b' }],
    ['a NUL byte', { id: 'a\u0000b' }],
    ['a SQL fragment', { id: "1' OR '1'='1" }],
    ['a unicode homoglyph', { id: 'аbc' }],
    ['a number', { id: 42 }],
    ['an array', { id: ['a'] }],
    ['null', { id: null }],
    ['a missing id', {}],
    ['an extra key', { id: 'a', role: 'ADMIN' }],
  ])('rejects %s', (_label, params) => {
    expect(messageSpeechParamsSchema.safeParse(params).success).toBe(false);
  });
});
