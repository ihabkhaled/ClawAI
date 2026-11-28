import { describe, expect, it, vi } from 'vitest';

import {
  LONG_OUTPUT_CONTINUE_NOTE,
  LONG_OUTPUT_MAX_ROUNDS,
} from '../../constants/long-input.constants';
import type { NarrationService } from '../../services/narration.service';
import type { AssembledContext } from '../../types/context.types';
import type { LlmResponse, MessageRoutedData } from '../../types/execution.types';
import type { ChatExecutionManager } from '../chat-execution.manager';
import { LongOutputManager } from '../long-output.manager';

const reply = (content: string, finishReason: string): LlmResponse => ({
  content,
  provider: 'p',
  model: 'm',
  inputTokens: 10,
  outputTokens: 5,
  latencyMs: 2,
  usedFallback: false,
  finishReason,
});

const ANCHOR = { id: 'u1', role: 'USER', content: 'write a very long list', metadata: null };
const CONTEXT = { systemPrompt: null, threadMessages: [ANCHOR] } as unknown as AssembledContext;
const PAYLOAD = { threadId: 't1' } as MessageRoutedData;

function build(next: LlmResponse[]): {
  manager: LongOutputManager;
  execute: ReturnType<typeof vi.fn>;
} {
  const execute = vi.fn();
  for (const response of next) execute.mockResolvedValueOnce(response);
  const narration = { append: vi.fn().mockResolvedValue(undefined) } as unknown as NarrationService;
  return {
    manager: new LongOutputManager({ execute } as unknown as ChatExecutionManager, narration),
    execute,
  };
}

describe('LongOutputManager (ADR-231)', () => {
  it('continues a cut answer until it ends and joins the pieces', async () => {
    const { manager, execute } = build([reply('two ', 'length'), reply('three.', 'stop')]);

    const joined = await manager.complete({
      response: reply('one ', 'length'),
      context: CONTEXT,
      payload: PAYLOAD,
      threadSettings: undefined,
      anchor: ANCHOR as never,
    });

    expect(joined.content).toBe('one two three.');
    expect(joined.finishReason).toBe('stop');
    expect(joined.outputTokens).toBe(15);
    const second = execute.mock.calls[0]?.[1] as AssembledContext;
    expect(second.threadMessages.at(-2)).toMatchObject({ role: 'ASSISTANT', content: 'one ' });
    expect(second.threadMessages.at(-1)).toMatchObject({
      role: 'USER',
      content: LONG_OUTPUT_CONTINUE_NOTE,
    });
    const third = execute.mock.calls[1]?.[1] as AssembledContext;
    expect(third.threadMessages.at(-2)).toMatchObject({ content: 'one two ' });
  });

  it('stops at the round cap and when the user stops', async () => {
    const endless = Array.from({ length: LONG_OUTPUT_MAX_ROUNDS + 5 }, () => reply('x', 'length'));
    const capped = build(endless);
    await capped.manager.complete({
      response: reply('x', 'length'),
      context: CONTEXT,
      payload: PAYLOAD,
      threadSettings: undefined,
      anchor: ANCHOR as never,
    });
    expect(capped.execute).toHaveBeenCalledTimes(LONG_OUTPUT_MAX_ROUNDS);

    const stopped = build([reply('', 'cancelled')]);
    const result = await stopped.manager.complete({
      response: reply('part', 'length'),
      context: CONTEXT,
      payload: PAYLOAD,
      threadSettings: undefined,
      anchor: ANCHOR as never,
    });
    expect(result.content).toBe('part');
    expect(stopped.execute).toHaveBeenCalledTimes(1);
  });

  it('treats only a length stop with text as cut', () => {
    const { manager } = build([]);
    expect(manager.isCut(reply('a', 'length'))).toBe(true);
    expect(manager.isCut(reply('a', 'max_tokens'))).toBe(true);
    expect(manager.isCut(reply('a', 'stop'))).toBe(false);
    expect(manager.isCut(reply('', 'length'))).toBe(false);
  });
});
