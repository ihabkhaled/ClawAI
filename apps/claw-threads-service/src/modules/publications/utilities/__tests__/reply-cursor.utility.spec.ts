import { BadRequestException } from '@nestjs/common';

import { decodeReplyCursor, encodeReplyCursor } from '../reply-cursor.utility';

describe('reply cursor', () => {
  it('round-trips a position', () => {
    const createdAt = new Date('2026-10-14T10:00:00.123Z');
    const decoded = decodeReplyCursor(encodeReplyCursor({ createdAt, id: 'r1' }));
    expect(decoded.id).toBe('r1');
    expect(decoded.createdAt.toISOString()).toBe(createdAt.toISOString());
  });

  it.each([
    'not-base64-json',
    Buffer.from('{}').toString('base64url'),
    Buffer.from('[1]').toString('base64url'),
    Buffer.from(JSON.stringify({ t: 'yesterday', i: 'r1' })).toString('base64url'),
    Buffer.from(JSON.stringify({ t: '2026-10-14T10:00:00.000Z', i: '' })).toString('base64url'),
    Buffer.from(JSON.stringify({ t: '2026-10-14T10:00:00.000Z', i: 'x'.repeat(65) })).toString(
      'base64url',
    ),
  ])('rejects a malformed cursor %#', (cursor) => {
    expect(() => decodeReplyCursor(cursor)).toThrow(BadRequestException);
  });
});
