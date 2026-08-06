import { RUNTIME_V2_CONTEXT_TOKEN_BUDGET } from '../../constants/runtime-v2-transcript.constants';
import { RuntimeV2LoopManager } from '../runtime-v2-loop.manager';

/**
 * The first turn of an agent run carries the whole admitted tool catalog in its
 * system prompt — around 17 KB. On the default 4096-token budget the assembler
 * splices the middle out of anything past 16 KB, so the model received a
 * truncated catalog it could not act on and the provider returned no content at
 * all. Continuations were given a runtime-sized budget; the turn that needs it
 * most was not, and every agent run died on its first call with
 * CLOUD_PROVIDER_EMPTY_RESPONSE.
 */
describe('RuntimeV2LoopManager context budget', () => {
  const binding = {
    ownerId: 'owner_1',
    threadId: 'thread_1',
    messageId: 'message_1',
    toolDefinitions: [],
  };

  function manager(assemble: jest.Mock): RuntimeV2LoopManager {
    const messages = {
      findRecentByThreadId: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
    };
    return new RuntimeV2LoopManager(
      messages as never,
      {} as never,
      {} as never,
      { assemble } as never,
      {} as never,
    );
  }

  function budgetOf(assemble: jest.Mock): unknown {
    return assemble.mock.calls[0]?.[2];
  }

  it('gives the first turn a budget that fits the tool catalog', async () => {
    const assemble = jest.fn().mockResolvedValue({ systemPrompt: 'base' });
    const loop = manager(assemble);

    await (
      loop as unknown as {
        buildFirstTurnContext: (
          bound: unknown,
          payload: unknown,
          thread: unknown,
        ) => Promise<unknown>;
      }
    ).buildFirstTurnContext(binding, { routingMode: 'MANUAL_MODEL' }, {});

    expect(budgetOf(assemble)).toEqual({ maxTokens: RUNTIME_V2_CONTEXT_TOKEN_BUDGET });
  });

  it('keeps the same budget on a continuation', async () => {
    const assemble = jest.fn().mockResolvedValue({ systemPrompt: 'base' });
    const loop = manager(assemble);
    const command = {
      result: {
        invocationId: 'invocation_1',
        status: 'succeeded',
        structured: {},
        receipt: { invocationId: 'invocation_1' },
        continuation: { action: 'continue', nextTurnId: 'turn_2' },
      },
    };

    await (
      loop as unknown as {
        buildContinuationContext: (
          bound: unknown,
          command: unknown,
          thread: unknown,
        ) => Promise<unknown>;
      }
    ).buildContinuationContext(binding, command, {});

    expect(budgetOf(assemble)).toEqual({ maxTokens: RUNTIME_V2_CONTEXT_TOKEN_BUDGET });
  });
});

/**
 * The intent nudge asks the model once more when it announced work and stopped.
 * It is best effort: a provider that answers the extra call with nothing must
 * not cost the user the answer the first call already produced.
 */
describe('RuntimeV2LoopManager intent correction fallback', () => {
  const binding = {
    ownerId: 'owner_1',
    threadId: 'thread_1',
    messageId: 'message_1',
    provider: 'OLLAMA',
    model: 'kimi-k2.7-code',
    toolDefinitions: [
      {
        schemaVersion: '2.0',
        name: 'workspace.files',
        version: '2.0.0',
        description: 'Bounded workspace discovery.',
        operations: ['list'],
        riskClasses: ['inspect'],
        targetIds: ['target:workspace'],
        inputSchema: {},
      },
    ],
  };
  const announced = { content: 'Let me start by exploring the workspace.' };

  function correct(callProvider: jest.Mock): Promise<{ output: { content?: string } }> {
    const loop = new RuntimeV2LoopManager(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { callProvider } as never,
    );
    return (
      loop as unknown as {
        turnWithDriftCorrection: (
          bound: unknown,
          context: unknown,
          routingMode: string,
          turn: unknown,
        ) => Promise<{ output: { content?: string } }>;
      }
    ).turnWithDriftCorrection(binding, { systemPrompt: 'base' }, 'MANUAL_MODEL', {
      response: announced,
      output: { kind: 'final', content: announced.content },
    });
  }

  it('keeps the original answer when the corrective call fails', async () => {
    const callProvider = jest
      .fn()
      .mockRejectedValue(new Error('Cloud provider OLLAMA returned no message content'));

    const result = await correct(callProvider);

    expect(callProvider).toHaveBeenCalledTimes(1);
    expect(result.output.content).toBe(announced.content);
  });

  it('uses the corrected turn when the model does act', async () => {
    const toolJson = JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: { rootKey: 'workspace-1', path: '' },
      targetId: 'target:workspace',
    });
    const callProvider = jest.fn().mockResolvedValue({ content: toolJson });

    const result = await correct(callProvider);

    expect(result.output).toMatchObject({ kind: 'tool', operation: 'list' });
  });
});
