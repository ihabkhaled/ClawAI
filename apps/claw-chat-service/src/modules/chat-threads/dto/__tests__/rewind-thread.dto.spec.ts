import { rewindThreadSchema } from '../rewind-thread.dto';

describe('rewindThreadSchema', () => {
  it('accepts a message id and trims it', () => {
    expect(rewindThreadSchema.parse({ afterMessageId: ' msg-1 ' })).toEqual({
      afterMessageId: 'msg-1',
    });
  });

  it.each([
    ['missing', {}],
    ['blank', { afterMessageId: '   ' }],
    ['too long', { afterMessageId: 'x'.repeat(256) }],
    ['not a string', { afterMessageId: 42 }],
    ['unknown key', { afterMessageId: 'msg-1', extra: true }],
  ])('rejects %s', (_label, body) => {
    expect(rewindThreadSchema.safeParse(body).success).toBe(false);
  });
});
