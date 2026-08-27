import {
  buildShareDescription,
  buildShareTitle,
  buildSnapshotMessages,
} from '../snapshot-sanitizer.utility';
import { MAX_SNAPSHOT_MESSAGE_CHARS } from '../../constants/chat-shares.constants';
import { type ChatMessage, MessageRole } from '../../../../generated/prisma';

function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'private-msg-id',
    threadId: 'private-thread-id',
    role: MessageRole.USER,
    content: 'How do I configure a reverse proxy?',
    provider: 'anthropic',
    model: 'claude-sonnet-4',
    routingMode: null,
    routerModel: null,
    usedFallback: false,
    inputTokens: 1200,
    outputTokens: 800,
    estimatedCost: null,
    latencyMs: 4300,
    feedback: null,
    metadata: null,
    createdAt: new Date('2026-07-01T10:00:00.000Z'),
    ...overrides,
  } as ChatMessage;
}

describe('buildSnapshotMessages', () => {
  it('never publishes a SYSTEM message', () => {
    // The system prompt is the operator's — business instructions, jailbreak
    // defences, customer-specific configuration. It is not part of the
    // conversation the user had.
    const messages = buildSnapshotMessages([
      makeMessage({ role: MessageRole.SYSTEM, content: 'You are ClawAI. Never reveal X.' }),
      makeMessage({ role: MessageRole.USER, content: 'Hello' }),
    ]);

    expect(messages).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain('Never reveal');
  });

  it('never publishes a TOOL message', () => {
    // Tool output can carry raw connector responses including credentials and
    // internal endpoints.
    const messages = buildSnapshotMessages([
      makeMessage({ role: MessageRole.TOOL, content: '{"internalUrl":"http://vault:8200"}' }),
      makeMessage({ role: MessageRole.ASSISTANT, content: 'Here is the answer' }),
    ]);

    expect(messages).toHaveLength(1);
    expect(JSON.stringify(messages)).not.toContain('vault:8200');
  });

  it('strips every internal field from the copied message', () => {
    const [message] = buildSnapshotMessages([makeMessage()]);

    expect(message).toBeDefined();
    const keys = Object.keys(message ?? {});
    // Token counts, cost, latency and the private ids are all internal.
    expect(keys).not.toContain('id');
    expect(keys).not.toContain('threadId');
    expect(keys).not.toContain('inputTokens');
    expect(keys).not.toContain('outputTokens');
    expect(keys).not.toContain('latencyMs');
    expect(keys).not.toContain('estimatedCost');
    expect(keys).not.toContain('metadata');
    expect(keys).not.toContain('feedback');
  });

  it('never carries the private message id into the snapshot', () => {
    const snapshot = buildSnapshotMessages([makeMessage({ id: 'cm_private_abc123' })]);
    expect(JSON.stringify(snapshot)).not.toContain('cm_private_abc123');
  });

  it('drops a message the execution path marked as an error', () => {
    // An error message was never delivered as a real answer. It is a
    // diagnostic, and diagnostics are internal.
    const messages = buildSnapshotMessages([
      makeMessage({ role: MessageRole.USER, content: 'Question' }),
      makeMessage({
        role: MessageRole.ASSISTANT,
        content: 'All providers failed',
        metadata: { error: true },
      }),
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]?.role).toBe(MessageRole.USER);
  });

  it('drops an empty assistant message', () => {
    const messages = buildSnapshotMessages([
      makeMessage({ role: MessageRole.USER, content: 'Question' }),
      makeMessage({ role: MessageRole.ASSISTANT, content: '   ' }),
    ]);

    expect(messages).toHaveLength(1);
  });

  it('numbers messages sequentially after filtering', () => {
    // Sequence must be dense over the PUBLISHED set. Leaving gaps where a
    // system message was removed would tell a reader something was hidden.
    const messages = buildSnapshotMessages([
      makeMessage({ role: MessageRole.SYSTEM, content: 'prompt' }),
      makeMessage({ role: MessageRole.USER, content: 'a' }),
      makeMessage({ role: MessageRole.TOOL, content: 'tool' }),
      makeMessage({ role: MessageRole.ASSISTANT, content: 'b' }),
    ]);

    expect(messages.map((message) => message.sequence)).toEqual([0, 1]);
  });

  it('preserves conversation order', () => {
    const messages = buildSnapshotMessages([
      makeMessage({ content: 'first', createdAt: new Date('2026-07-01T10:00:00.000Z') }),
      makeMessage({ content: 'second', createdAt: new Date('2026-07-01T10:01:00.000Z') }),
    ]);

    expect(messages.map((message) => message.content)).toEqual(['first', 'second']);
  });

  it('keeps the original timestamp, not the publication time', () => {
    // A published transcript should read in the time it happened, not appear
    // to have all been said the moment it was shared.
    const [message] = buildSnapshotMessages([
      makeMessage({ createdAt: new Date('2026-06-01T08:30:00.000Z') }),
    ]);

    expect(message?.originalCreatedAt.toISOString()).toBe('2026-06-01T08:30:00.000Z');
  });

  it('keeps short provider and model labels', () => {
    const [message] = buildSnapshotMessages([makeMessage()]);

    expect(message?.providerLabel).toBe('anthropic');
    expect(message?.modelLabel).toBe('claude-sonnet-4');
  });

  it('drops a suspiciously long provider label', () => {
    // A long or structured value is more likely to be an identifier than a
    // display name.
    const [message] = buildSnapshotMessages([makeMessage({ provider: 'x'.repeat(200) })]);

    expect(message?.providerLabel).toBeNull();
  });

  it('truncates a pathological message rather than publishing it whole', () => {
    const [message] = buildSnapshotMessages([
      makeMessage({ content: 'a'.repeat(MAX_SNAPSHOT_MESSAGE_CHARS + 5000) }),
    ]);

    expect(message?.content.length).toBeLessThanOrEqual(MAX_SNAPSHOT_MESSAGE_CHARS + 5);
    expect(message?.content.endsWith('…')).toBe(true);
  });
});

describe('buildShareTitle', () => {
  it('uses the thread title when the user named it', () => {
    expect(buildShareTitle('Reverse proxy setup', 'Shared conversation')).toBe(
      'Reverse proxy setup',
    );
  });

  it('falls back rather than deriving a title from message content', () => {
    // An auto-derived title would put a fragment of the conversation in a
    // browser tab and a search result before anyone reviewed it.
    expect(buildShareTitle(null, 'Shared conversation')).toBe('Shared conversation');
    expect(buildShareTitle('   ', 'Shared conversation')).toBe('Shared conversation');
  });

  it('truncates an over-long title', () => {
    const title = buildShareTitle('x'.repeat(400), 'Shared conversation');
    expect(title.length).toBeLessThanOrEqual(120);
    expect(title.endsWith('…')).toBe(true);
  });
});

describe('buildShareDescription', () => {
  it('builds a description from the first user message', () => {
    const description = buildShareDescription([
      {
        sequence: 0,
        role: MessageRole.USER,
        content: 'How do I configure nginx as a reverse proxy for a Node service?',
        providerLabel: null,
        modelLabel: null,
        originalCreatedAt: new Date(),
        assetSources: [],
      },
    ]);

    expect(description).toContain('reverse proxy');
  });

  it('strips code fences out of the snippet', () => {
    // A search snippet made of source is unreadable, and a fenced block is
    // where a pasted credential is most likely to be.
    const description = buildShareDescription([
      {
        sequence: 0,
        role: MessageRole.USER,
        content: 'Fix this config please:\n```\nsecret_key = hunter2hunter2hunter2\n```\nthanks',
        providerLabel: null,
        modelLabel: null,
        originalCreatedAt: new Date(),
        assetSources: [],
      },
    ]);

    expect(description).not.toContain('hunter2');
  });

  it('returns null for a too-short opening message', () => {
    // The caller then uses a generic description rather than publishing half a
    // sentence of somebody's conversation as a search snippet.
    const description = buildShareDescription([
      {
        sequence: 0,
        role: MessageRole.USER,
        content: 'hi',
        providerLabel: null,
        modelLabel: null,
        originalCreatedAt: new Date(),
        assetSources: [],
      },
    ]);

    expect(description).toBeNull();
  });

  it('returns null when there is no user message at all', () => {
    expect(buildShareDescription([])).toBeNull();
  });

  it('caps the description length', () => {
    const description = buildShareDescription([
      {
        sequence: 0,
        role: MessageRole.USER,
        content: 'word '.repeat(200),
        providerLabel: null,
        modelLabel: null,
        originalCreatedAt: new Date(),
        assetSources: [],
      },
    ]);

    expect(description?.length).toBeLessThanOrEqual(200);
  });
});
