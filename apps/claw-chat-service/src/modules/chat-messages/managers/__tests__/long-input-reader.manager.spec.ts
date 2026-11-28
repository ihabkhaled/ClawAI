import { describe, expect, it, vi } from 'vitest';

import { NarrationKind } from '../../../../common/enums/narration-kind.enum';
import type { ChatExecutionManager } from '../chat-execution.manager';
import type { ChatStreamService } from '../../services/chat-stream.service';
import type { ResearchGateService } from '../../services/research-gate.service';
import type { NarrationService } from '../../services/narration.service';
import type { AssembledContext } from '../../types/context.types';
import type { MessageRoutedData } from '../../types/execution.types';
import { LongInputReaderManager } from '../long-input-reader.manager';

const PAYLOAD = {
  messageId: 'msg-1',
  threadId: 'thread-1',
  selectedProvider: 'OLLAMA_CLOUD',
  selectedModel: 'small',
  routingMode: 'AUTO',
} as MessageRoutedData;

function contextWith(text: string): AssembledContext {
  return {
    userId: 'u1',
    systemPrompt: null,
    threadMessages: [{ id: 'msg-1', role: 'USER', content: 'List every claim', metadata: null }],
    memories: [],
    contextPackItems: [],
    fileContents: [{ id: 'f1', filename: 'big.txt', mimeType: 'text/plain', extractedText: 'cut' }],
    workspaceCitations: [],
    researchEvidence: [],
    researchRequested: false,
    tokenBudget: 1000,
    oversizedFiles: [{ fileId: 'f1', filename: 'big.txt', text }],
  } as unknown as AssembledContext;
}

function build(
  reply: (prompt: string) => string | Error,
  eachPart = false,
): {
  manager: LongInputReaderManager;
  calls: string[];
  narration: { append: ReturnType<typeof vi.fn> };
  deltas: string[];
} {
  const calls: string[] = [];
  const execution = {
    callProvider: vi.fn(async (_p: string, _m: string, context: AssembledContext) => {
      const prompt = String(context.threadMessages[0]?.content ?? '');
      calls.push(prompt);
      // A continuation call carries the partial result as its second turn.
      const answer = reply(context.threadMessages.length > 1 ? 'CONTINUE' : prompt);
      if (answer instanceof Error) throw answer;
      const cut = answer.endsWith('…');
      return {
        content: cut ? answer.slice(0, -1) : answer,
        provider: 'x',
        model: 'y',
        latencyMs: 1,
        usedFallback: false,
        finishReason: cut ? 'length' : 'stop',
      };
    }),
  } as unknown as ChatExecutionManager;
  const narration = { append: vi.fn().mockResolvedValue(undefined) };
  const gate = {
    askPlanner: vi.fn(async (_prompt: string, _tokens: number, parse: (raw: string) => unknown) =>
      parse(JSON.stringify({ eachPart })),
    ),
  } as unknown as ResearchGateService;
  const deltas: string[] = [];
  const stream = {
    emitContentDelta: vi.fn((_thread: string, input: { delta: string }) =>
      deltas.push(input.delta),
    ),
  } as unknown as ChatStreamService;
  return {
    manager: new LongInputReaderManager(
      execution,
      narration as unknown as NarrationService,
      gate,
      stream,
    ),
    calls,
    narration,
    deltas,
  };
}

// A 2,048-token window: parts are the 2,000-character minimum.
const SMALL_WINDOW = {
  contextWindowTokens: 2_048,
  provider: 'OLLAMA_CLOUD',
  maxTokens: 256,
} as never;

describe('LongInputReaderManager (ADR-231)', () => {
  it('reads every part with only the instruction as context and replaces the file with complete notes', async () => {
    const text = Array.from(
      { length: 60 },
      (_v, i) => `Claim ${String(i)}: the value is ${String(i * 7)}.`,
    ).join('\n\n');
    const { manager, calls, narration } = build(
      (prompt) => `notes of ${prompt.includes('part="1 of') ? 'first' : 'other'}`,
    );

    const { context } = await manager.readAll({
      context: contextWith(text.repeat(4)),
      payload: PAYLOAD,
      threadSettings: SMALL_WINDOW,
      request: 'List every claim',
    });

    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every((prompt) => prompt.includes('<document_part'))).toBe(true);
    const notes = context.fileContents[0]?.extractedText ?? '';
    expect(notes).toContain(`--- Part 1 of ${String(calls.length)} ---\nnotes of first`);
    expect(notes.startsWith('The whole of "big.txt" was read in')).toBe(true);
    expect(context.oversizedFiles).toEqual([]);
    const kinds = narration.append.mock.calls.map(
      (args: unknown[]) => (args[1] as { kind: string }).kind,
    );
    expect(kinds.every((kind) => kind === NarrationKind.LONG_INPUT)).toBe(true);
    expect(kinds.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps a failed part as a visible gap instead of dropping it', async () => {
    const text = `${'alpha '.repeat(400)}\n\n${'beta '.repeat(400)}`;
    let n = 0;
    const { manager } = build(() => (++n === 1 ? new Error('provider down') : 'fine'));

    const { context } = await manager.readAll({
      context: contextWith(text),
      payload: PAYLOAD,
      threadSettings: SMALL_WINDOW,
      request: 'summarise',
    });

    expect(context.fileContents[0]?.extractedText).toContain('could not be read');
  });

  it('changes nothing when every file fitted', async () => {
    const { manager, calls } = build(() => 'x');
    const base = { ...contextWith('small'), oversizedFiles: [] } as AssembledContext;
    const result = await manager.readAll({
      context: base,
      payload: PAYLOAD,
      threadSettings: SMALL_WINDOW,
      request: 'q',
    });
    expect(result.context).toBe(base);
    expect(result.answer).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('carries a whole-document request out on every part and streams the joined answer in order', async () => {
    const text = Array.from({ length: 40 }, (_v, i) => `سطر رقم ${String(i)} من الوثيقة.`).join(
      '\n\n',
    );
    const { manager, calls, deltas } = build((prompt) => {
      const part = /part="(\d+) of/u.exec(prompt)?.[1] ?? '?';
      return `translated part ${part}`;
    }, true);

    const result = await manager.readAll({
      context: contextWith(text.repeat(8)),
      payload: PAYLOAD,
      threadSettings: SMALL_WINDOW,
      request: 'Translate the whole document into English',
    });

    expect(calls.length).toBeGreaterThan(1);
    expect(calls.every((prompt) => prompt.includes('Carry out the user request'))).toBe(true);
    const answer = result.answer?.content ?? '';
    const expected = calls.map((_c, i) => `translated part ${String(i + 1)}`).join('\n\n');
    expect(answer).toBe(expected);
    expect(deltas.join('')).toBe(expected);
    expect(result.answer?.finishReason).toBe('stop');
  });

  it('continues a part whose result the output limit cut, until it ends', async () => {
    const text = `${'kappa '.repeat(300)}`;
    const { manager, calls } = build(
      (prompt) => (prompt === 'CONTINUE' ? 'second half.' : 'first half …'),
      true,
    );

    const result = await manager.readAll({
      context: contextWith(text),
      payload: PAYLOAD,
      threadSettings: SMALL_WINDOW,
      request: 'Rewrite it all',
    });

    expect(result.answer?.content).toBe('first half second half.');
    expect(calls).toHaveLength(2);
  });
});
