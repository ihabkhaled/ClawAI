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
