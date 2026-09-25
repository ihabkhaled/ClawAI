import { TokenLedgerContext } from '@claw/shared-types';

import { type ChatMessage } from '../../../../generated/prisma';
import { type ChatContextBundle } from '../../types/chat-context-gateway.types';
import { type ChatExecutionManager } from '../chat-execution.manager';
import { ModeExecutionGatewayManager } from '../mode-execution-gateway.manager';

/**
 * A mode's model call must go through the same chokepoint a chat turn uses, or
 * it gets a different request shape, a second accounting path, and no access to
 * any connector the user configured.
 */

type CallProviderArgs = {
  provider: string;
  model: string;
  context: { threadMessages: ChatMessage[]; systemPrompt: string | null };
  threadSettings: unknown;
  ledgerContext: unknown;
  paygCall: unknown;
};

function message(id: string, content: string): ChatMessage {
  return {
    id,
    threadId: 'thread-1',
    role: 'USER',
    content,
    metadata: null,
  } as unknown as ChatMessage;
}

function harness(bundleOverrides: Partial<ChatContextBundle> = {}) {
  const calls: CallProviderArgs[] = [];
  const execution = {
    callProvider: async (
      provider: string,
      model: string,
      context: CallProviderArgs['context'],
      _startTime: number,
      _usedFallback: boolean,
      threadSettings: unknown,
      _routingMode: unknown,
      _executionOptions: unknown,
      ledgerContext: unknown,
      paygCall: unknown,
    ) => {
      calls.push({ provider, model, context, threadSettings, ledgerContext, paygCall });
      return { content: 'answer', provider, model, inputTokens: 1, outputTokens: 2 };
    },
  } as unknown as ChatExecutionManager;

  const bundle = {
    context: {
      userId: 'user-1',
      systemPrompt: 'You are terse.',
      threadMessages: [message('m1', 'earlier turn')],
      memories: [],
      fileContents: [],
    },
    thread: null,
    threadSettings: { temperature: 0.2 },
    messages: [],
    fileIds: [],
    latestUserMetadata: null,
    ...bundleOverrides,
  } as unknown as ChatContextBundle;

  return { manager: new ModeExecutionGatewayManager(execution), calls, bundle };
}

describe('ModeExecutionGatewayManager', () => {
  it('calls the shared chokepoint rather than a provider directly', async () => {
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      provider: 'GEMINI',
      model: 'gemini-2.5-flash',
      ledgerContext: TokenLedgerContext.BEST_OF_N,
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ provider: 'GEMINI', model: 'gemini-2.5-flash' });
  });

  it('appends the mode question instead of replacing the conversation', async () => {
    // Replacing it is the judge's defect: an answer judged without the
    // conversation that produced it.
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      prompt: 'sub-task: list the files',
      provider: 'OPENAI',
      model: 'gpt-5',
      ledgerContext: TokenLedgerContext.BEST_OF_N,
    });

    expect(calls[0]?.context.threadMessages.map((m) => m.content)).toEqual([
      'earlier turn',
      'sub-task: list the files',
    ]);
  });

  it('keeps the assembled system prompt untouched', async () => {
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      prompt: 'anything',
      provider: 'OPENAI',
      model: 'gpt-5',
      ledgerContext: TokenLedgerContext.VERIFY,
    });

    expect(calls[0]?.context.systemPrompt).toBe('You are terse.');
  });

  it('sends the conversation as-is when the mode adds no question of its own', async () => {
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      provider: 'OPENAI',
      model: 'gpt-5',
      ledgerContext: TokenLedgerContext.CONSENSUS,
    });

    expect(calls[0]?.context.threadMessages).toHaveLength(1);
  });

  it('forwards the thread settings, ledger column and billing tag', async () => {
    // Without the workflow tag a lab run's spend stops being attributable.
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      provider: 'ANTHROPIC',
      model: 'claude-sonnet-4',
      ledgerContext: TokenLedgerContext.REPAIR,
      paygCall: { workflow: 'repair', requestId: 'repair:1' },
    });

    expect(calls[0]?.threadSettings).toMatchObject({ temperature: 0.2 });
    expect(calls[0]?.ledgerContext).toBe(TokenLedgerContext.REPAIR);
    expect(calls[0]?.paygCall).toMatchObject({ workflow: 'repair' });
  });

  it('ignores a blank prompt rather than appending an empty turn', async () => {
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      prompt: '   ',
      provider: 'OPENAI',
      model: 'gpt-5',
      ledgerContext: TokenLedgerContext.PIPELINE,
    });

    expect(calls[0]?.context.threadMessages).toHaveLength(1);
  });

  it('does not repeat the user turn when the mode prompt IS that turn', async () => {
    // A lab passes the user's request as its prompt, and the gateway has
    // already put that request (or, for an attachment-only send, the spelled
    // out instruction) on the last user row. Appending it again sent the same
    // words twice as two consecutive user turns.
    const { manager, calls, bundle } = harness();

    await manager.run({
      bundle,
      prompt: 'earlier turn',
      provider: 'OPENAI',
      model: 'gpt-5',
      ledgerContext: TokenLedgerContext.BEST_OF_N,
    });

    expect(calls[0]?.context.threadMessages.map((m) => m.content)).toEqual(['earlier turn']);
  });
});
