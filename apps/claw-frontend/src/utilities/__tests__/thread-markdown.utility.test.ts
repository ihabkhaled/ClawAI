import { describe, expect, it } from 'vitest';

import { MessageRole } from '@/enums';
import type { ChatMessage } from '@/types';
import {
  buildThreadExportFilename,
  buildThreadMarkdown,
} from '@/utilities/thread-markdown.utility';

function message(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'm1',
    threadId: 't1',
    role: MessageRole.USER,
    content: 'Hello',
    provider: null,
    model: null,
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: null,
    outputTokens: null,
    feedback: null,
    latencyMs: null,
    metadata: null,
    createdAt: '2026-08-27T10:00:00.000Z',
    ...overrides,
  } as ChatMessage;
}

const EXPORTED_AT = '2026-08-27T12:00:00.000Z';

describe('buildThreadMarkdown', () => {
  it('records which model answered each turn', () => {
    // The whole point of the export: in a product where one thread moves
    // between nine model families, a transcript that does not say who answered
    // is actively misleading.
    const markdown = buildThreadMarkdown({
      title: 'Routing question',
      exportedAt: EXPORTED_AT,
      messages: [
        message({ content: 'Why this model?' }),
        message({
          id: 'm2',
          role: MessageRole.ASSISTANT,
          content: 'Because it was cheapest.',
          provider: 'OPENAI',
          model: 'gpt-5',
        }),
      ],
    });

    expect(markdown).toContain('## Assistant — OPENAI / gpt-5');
    expect(markdown).toContain('Because it was cheapest.');
  });

  it('omits the attribution entirely when there is none, rather than printing an empty dash', () => {
    const markdown = buildThreadMarkdown({
      title: 'T',
      exportedAt: EXPORTED_AT,
      messages: [message()],
    });

    expect(markdown).toContain('## User');
    expect(markdown).not.toContain('## User —');
  });

  it('states when it was exported, so a pasted transcript still dates itself', () => {
    const markdown = buildThreadMarkdown({
      title: 'T',
      exportedAt: EXPORTED_AT,
      messages: [message()],
    });

    expect(markdown).toContain(EXPORTED_AT);
    expect(markdown).toContain('1 messages');
  });

  it('renders an empty thread as a header rather than throwing', () => {
    expect(buildThreadMarkdown({ title: 'T', exportedAt: EXPORTED_AT, messages: [] })).toContain(
      '# T',
    );
  });

  it('labels every role, including tool turns', () => {
    const markdown = buildThreadMarkdown({
      title: 'T',
      exportedAt: EXPORTED_AT,
      messages: [message({ role: MessageRole.TOOL, content: 'ran a command' })],
    });

    expect(markdown).toContain('## Tool');
  });
});

describe('buildThreadExportFilename', () => {
  it('slugifies the title', () => {
    expect(buildThreadExportFilename('Why this model?', 't1')).toBe('clawai-why-this-model.md');
  });

  it('falls back to the thread id, so two exports never collide as "conversation.md"', () => {
    expect(buildThreadExportFilename('???', 'thread-42')).toBe('clawai-thread-42.md');
    expect(buildThreadExportFilename('', 'thread-42')).toBe('clawai-thread-42.md');
  });

  it('caps a very long title instead of producing an unusable filename', () => {
    const name = buildThreadExportFilename('a'.repeat(200), 't1');

    expect(name.length).toBeLessThanOrEqual('clawai-'.length + 60 + '.md'.length);
  });

  it('does not leave a trailing separator when the title ends in punctuation', () => {
    expect(buildThreadExportFilename('Done!', 't1')).toBe('clawai-done.md');
  });
});
