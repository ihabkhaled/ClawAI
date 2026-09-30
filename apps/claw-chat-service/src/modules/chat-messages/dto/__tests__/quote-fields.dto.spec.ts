import { createMessageSchema } from '../create-message.dto';

const base = { threadId: 't-1' };

describe('createMessageSchema quotes', () => {
  it('accepts a quote-only turn with nothing typed', () => {
    const parsed = createMessageSchema.safeParse({
      ...base,
      content: '',
      quotes: [{ sourceMessageId: 'm-1', text: 'explain this' }],
    });

    expect(parsed.success).toBe(true);
  });

  it('still refuses an empty turn with no quote and no file', () => {
    expect(createMessageSchema.safeParse({ ...base, content: '' }).success).toBe(false);
  });

  it('caps quotes at three', () => {
    const quotes = Array.from({ length: 4 }, (_, index) => ({
      sourceMessageId: `m-${String(index)}`,
      text: 'x',
    }));

    expect(createMessageSchema.safeParse({ ...base, content: 'hi', quotes }).success).toBe(false);
  });

  it('caps quote text at 2,000 characters and refuses a blank quote', () => {
    const long = [{ sourceMessageId: 'm-1', text: 'x'.repeat(2001) }];
    const blank = [{ sourceMessageId: 'm-1', text: '   ' }];

    expect(createMessageSchema.safeParse({ ...base, content: 'hi', quotes: long }).success).toBe(
      false,
    );
    expect(createMessageSchema.safeParse({ ...base, content: 'hi', quotes: blank }).success).toBe(
      false,
    );
  });
});
