import { containsNulByte, stripNulBytes } from '../postgres-safe-text.utility';
import { createMessageSchema } from '../../../modules/chat-messages/dto/create-message.dto';

const NUL = String.fromCharCode(0);

describe('postgres-safe text', () => {
  it('removes NUL bytes and leaves everything else alone', () => {
    expect(stripNulBytes(`before${NUL}after`)).toBe('beforeafter');
    expect(stripNulBytes('plain text')).toBe('plain text');
    expect(stripNulBytes(`${NUL}${NUL}edge${NUL}`)).toBe('edge');
  });

  it('keeps other whitespace and control characters untouched', () => {
    expect(stripNulBytes('line\nnext\ttabbed')).toBe('line\nnext\ttabbed');
  });

  it('detects a NUL byte', () => {
    expect(containsNulByte(`x${NUL}y`)).toBe(true);
    expect(containsNulByte('xy')).toBe(false);
  });
});

// Postgres answers a NUL in a text column with SQLSTATE 22021 and Prisma
// surfaces that as an unhandled error, so a single 0x00 used to 500 the request
// and kill the thread with the raw database message in the log.
describe('createMessageSchema NUL handling', () => {
  it('accepts a message carrying a NUL byte and strips it', () => {
    const parsed = createMessageSchema.parse({
      threadId: 'thread-1',
      content: `hello${NUL}world`,
    });

    expect(parsed.content).toBe('helloworld');
    expect(containsNulByte(parsed.content)).toBe(false);
  });

  it('rejects content that is nothing but NUL bytes as empty, not as a 500', () => {
    expect(() =>
      createMessageSchema.parse({ threadId: 'thread-1', content: `${NUL}${NUL}` }),
    ).toThrow(/Content must not be empty/u);
  });

  it('still accepts ordinary content unchanged', () => {
    const parsed = createMessageSchema.parse({
      threadId: 'thread-1',
      content: 'a normal message',
    });

    expect(parsed.content).toBe('a normal message');
  });
});
