import { describe, expect, it } from 'vitest';

import { buildThreadSnapshot } from '../thread-snapshot.utility';

const message = (overrides: Record<string, unknown> = {}) => ({
  id: 'message-1',
  role: 'USER',
  content: 'A useful prompt',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  metadata: null,
  ...overrides,
});

describe('buildThreadSnapshot', () => {
  it('keeps ordered user and assistant text while dropping tools, failures, placeholders, and secrets', () => {
    const result = buildThreadSnapshot({
      threadId: 'thread-1',
      title: 'Research',
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      messages: [
        message(),
        message({ id: 'tool', role: 'TOOL', content: 'internal tool output' }),
        message({ id: 'failure', role: 'ASSISTANT', metadata: { error: true } }),
        message({ id: 'placeholder', content: 'Generating…', metadata: { placeholder: true } }),
        message({
          id: 'duplicate',
          content: 'duplicate chunk',
          metadata: { duplicateChunk: true },
        }),
        message({ id: 'secret', content: 'api_key=qa_fixture_value' }),
        message({
          id: 'answer',
          role: 'ASSISTANT',
          content: 'The answer is 42.',
          metadata: { fileIds: ['private-file'], provider: 'private-model' },
        }),
      ],
    });

    expect(result.messages.map(({ id }) => id)).toEqual(['message-1', 'answer']);
    expect(JSON.stringify(result)).not.toContain('private-file');
    expect(JSON.stringify(result)).not.toContain('private-model');
    expect(result.messageCount).toBe(2);
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('produces the same digest for the same source snapshot', () => {
    const input = {
      threadId: 'thread-1',
      title: 'Research',
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      messages: [message()],
    };

    expect(buildThreadSnapshot(input).sha256).toBe(buildThreadSnapshot(input).sha256);
  });

  it('rejects snapshots that exceed either fail-closed cap', () => {
    expect(() =>
      buildThreadSnapshot(
        {
          threadId: 'thread-1',
          title: null,
          createdAt: new Date('2026-10-01T10:00:00.000Z'),
          messages: [message({ content: 'x'.repeat(100) })],
        },
        { maxBytes: 50 },
      ),
    ).toThrow(/exceeds/);
  });
});

describe('buildThreadSnapshot attachment text (rule 42)', () => {
  const base = {
    threadId: 'thread-1',
    title: 'Docs',
    createdAt: new Date('2026-10-01T10:00:00.000Z'),
  };
  const file = (name: string, text: string | null) => ({ name, mimeType: 'text/plain', text });

  it('adds attached text to its user turn, never a file id or an assistant file', () => {
    const result = buildThreadSnapshot({
      ...base,
      messages: [
        message({
          metadata: { fileIds: ['file-secret-id'] },
          attachments: [file('notes.md', '# RFID notes\nTags at 13.56 MHz')],
        }),
        message({
          id: 'answer',
          role: 'ASSISTANT',
          content: 'Read it.',
          attachments: [file('ignored.txt', 'assistant files never travel')],
        }),
      ],
    });

    expect(result.messages[0]?.attachments).toEqual([
      { name: 'notes.md', mimeType: 'text/plain', text: '# RFID notes\nTags at 13.56 MHz' },
    ]);
    expect(result.messages[1]).not.toHaveProperty('attachments');
    expect(JSON.stringify(result)).not.toContain('file-secret-id');
    expect(JSON.stringify(result)).not.toContain('assistant files never travel');
    expect(result).not.toHaveProperty('attachmentNote');
  });

  it('keeps an attachment-only turn with text and drops one with nothing readable', () => {
    const result = buildThreadSnapshot({
      ...base,
      messages: [
        message({
          id: 'with-text',
          content: '',
          attachments: [file('cv.pdf', 'Jane Doe, engineer')],
        }),
        message({ id: 'no-text', content: '  ', attachments: [file('scan.png', null)] }),
      ],
    });

    expect(result.messages.map(({ id }) => id)).toEqual(['with-text']);
    expect(result.attachmentNote).toBe(
      'Attached file text: 1 attached file(s) had no readable text.',
    );
  });

  it('withholds an attached file that carries a secret but keeps the turn and says so', () => {
    const result = buildThreadSnapshot({
      ...base,
      messages: [
        message({
          attachments: [file('.env', 'password=hunter2-fixture'), file('ok.txt', 'plain text')],
        }),
      ],
    });

    expect(result.messages[0]?.attachments?.map(({ name }) => name)).toEqual(['ok.txt']);
    expect(JSON.stringify(result)).not.toContain('hunter2-fixture');
    expect(result.attachmentNote).toContain('1 attached file(s) withheld');
  });

  it('keeps the newest attached text inside the byte cap and notes what it left out', () => {
    const big = 'x'.repeat(600);
    const result = buildThreadSnapshot(
      {
        ...base,
        messages: [
          message({ id: 'old', attachments: [file('old.txt', `OLD${big}`)] }),
          message({ id: 'new', attachments: [file('new.txt', `NEW${big}`)] }),
        ],
      },
      { maxBytes: 2_000 },
    );

    expect(result.messages.find(({ id }) => id === 'new')?.attachments).toHaveLength(1);
    expect(result.messages.find(({ id }) => id === 'old')).not.toHaveProperty('attachments');
    expect(result.attachmentNote).toContain('1 attached file(s) left out');
    expect(result.byteCount).toBeLessThanOrEqual(2_000);
  });

  it('still fails closed when the conversation text alone is over the cap', () => {
    expect(() =>
      buildThreadSnapshot(
        {
          ...base,
          messages: [message({ content: 'y'.repeat(200), attachments: [file('a', 'b')] })],
        },
        { maxBytes: 100 },
      ),
    ).toThrow(/exceeds/);
  });

  it('keeps a very long file by its beginning and end with the cut named', () => {
    const text = `START${'m'.repeat(150_000)}END`;
    const result = buildThreadSnapshot({
      ...base,
      messages: [message({ attachments: [file('book.txt', text)] })],
    });
    const kept = result.messages[0]?.attachments?.[0]?.text ?? '';

    expect(kept.startsWith('START')).toBe(true);
    expect(kept.endsWith('END')).toBe(true);
    expect(kept).toMatch(/characters of this file omitted/);
    expect(kept.length).toBeLessThan(text.length);
    expect(result.attachmentNote).toContain('show only their beginning and end');
  });

  it('notes files never read because the thread had more than the file cap', () => {
    const result = buildThreadSnapshot({
      ...base,
      messages: [message()],
      unreadAttachmentCount: 3,
    });

    expect(result.attachmentNote).toContain('3 older attached file(s) not read');
  });
});
