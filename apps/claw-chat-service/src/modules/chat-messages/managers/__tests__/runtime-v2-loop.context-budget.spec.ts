import { BusinessException } from '../../../../common/errors';
import { RUNTIME_V2_EMPTY_RESPONSE_RETRIES } from '../../constants/runtime-v2-failure.constants';
import {
  RUNTIME_V2_CONTEXT_TOKEN_BUDGET,
  RUNTIME_V2_MAX_OUTPUT_TOKENS,
} from '../../constants/runtime-v2-transcript.constants';
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

describe('RuntimeV2LoopManager continuation ordering', () => {
  it('puts the current result after its request in the provider context', async () => {
    const largeContent = 'x'.repeat(900);
    const origin = { id: 'message_1', role: 'USER', content: 'Complete the mission.' };
    const request = { id: 'request_1', role: 'TOOL', content: '{"kind":"tool"}' };
    const stored = [origin, request];
    const create = jest.fn().mockImplementation((data: { role: string; content: string }) => {
      const created = { ...data, id: `message_${String(stored.length + 1)}` };
      if (data.role === 'TOOL') stored.push(created);
      return Promise.resolve(created);
    });
    const messages = {
      create,
      findRecentByThreadId: jest
        .fn()
        .mockImplementation(() => Promise.resolve([...stored].reverse())),
      findById: jest.fn().mockResolvedValue(origin),
    };
    const assemble = jest
      .fn()
      .mockImplementation((_ownerId, history) =>
        Promise.resolve({ systemPrompt: 'base', threadMessages: history }),
      );
    const callProvider = jest.fn().mockResolvedValue({
      content: '{"kind":"final","content":"finished"}',
      provider: 'OLLAMA',
      model: 'kimi-k2.7-code:cloud',
      latencyMs: 1,
    });
    const store = {
      appendModelOutput: jest.fn().mockResolvedValue(void 0),
      terminalize: jest.fn().mockResolvedValue(void 0),
    };
    const loop = new RuntimeV2LoopManager(
      messages as never,
      {} as never,
      store as never,
      { assemble } as never,
      { callProvider } as never,
    );
    const binding = {
      ownerId: 'owner_1',
      threadId: 'thread_1',
      messageId: origin.id,
      runId: 'run_1',
      generation: 'generation_1',
      provider: 'OLLAMA',
      model: 'kimi-k2.7-code:cloud',
      toolDefinitions: [],
    };
    const command = {
      idempotencyKey: 'result_key_1',
      result: {
        invocationId: 'invocation_1',
        status: 'succeeded',
        structured: { content: largeContent },
        receipt: { invocationId: 'invocation_1' },
        continuation: { action: 'continue', nextTurnId: 'turn_2' },
      },
    };

    await (
      loop as unknown as {
        continueClaimedRun: (
          bound: unknown,
          result: unknown,
          thread: unknown,
          claimId: string,
        ) => Promise<void>;
      }
    ).continueClaimedRun(binding, command, {}, 'claim_1');

    const providerContext = callProvider.mock.calls[0]?.[2] as {
      systemPrompt: string;
      threadMessages: Array<{ role: string; content: string }>;
    };
    expect(providerContext.systemPrompt).toContain(largeContent);
    expect(providerContext.threadMessages.at(-2)).toEqual(request);
    expect(providerContext.threadMessages.at(-1)).toMatchObject({
      role: 'TOOL',
      content: expect.stringContaining('"status":"succeeded"'),
    });
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

describe('RuntimeV2LoopManager announced-without-acting', () => {
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

  it('fails visibly, quoting the model, when it announces again after the nudge', async () => {
    // Storing a second announcement as a completed answer is the silent stop:
    // the panel shows "I'll start by…" and the task is simply over.
    const announcement = 'I will now read the configuration files to understand the layout.';
    const callProvider = jest.fn().mockResolvedValue({ content: announcement });
    const loop = new RuntimeV2LoopManager(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { callProvider } as never,
    );

    await expect(
      (
        loop as unknown as {
          turnWithDriftCorrection: (
            bound: unknown,
            context: unknown,
            routingMode: string,
            turn: unknown,
          ) => Promise<unknown>;
        }
      ).turnWithDriftCorrection(binding, { systemPrompt: 'base' }, 'MANUAL_MODEL', {
        response: { content: 'Let me start by listing the workspace.' },
        output: { kind: 'final', content: 'Let me start by listing the workspace.' },
      }),
    ).rejects.toMatchObject({
      code: 'MODEL_ANNOUNCED_WITHOUT_ACTING',
      message: expect.stringContaining(announcement),
    });
  });

  // One nudge was too few. Narration is a habit, not a refusal: glm-5.2 said
  // "I need to see the exact lines… Let me read the specific line ranges" — the
  // right next step, described instead of requested — and a single correction
  // ended a run that had already read the file it was asked to change.
  it('keeps asking, and accepts the tool call when a later nudge lands', async () => {
    const toolCall = JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: {},
      targetId: 'target:workspace',
    });
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({ content: 'Let me read the specific line ranges first.' })
      .mockResolvedValueOnce({ content: toolCall });
    const loop = new RuntimeV2LoopManager(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { callProvider } as never,
    );

    const result = (await (
      loop as unknown as {
        turnWithDriftCorrection: (
          bound: unknown,
          context: unknown,
          routingMode: string,
          turn: unknown,
        ) => Promise<{ output: { kind: string; toolName?: string } }>;
      }
    ).turnWithDriftCorrection(binding, { systemPrompt: 'base' }, 'MANUAL_MODEL', {
      response: { content: 'Let me start by listing the workspace.' },
      output: { kind: 'final', content: 'Let me start by listing the workspace.' },
    })) as { output: { kind: string; toolName?: string } };

    expect(result.output.kind).toBe('tool');
    expect(result.output.toolName).toBe('workspace.files');
    expect(callProvider).toHaveBeenCalledTimes(2);
  });
});

describe('RuntimeV2LoopManager empty-response retry', () => {
  const binding = {
    ownerId: 'owner_1',
    threadId: 'thread_1',
    messageId: 'message_1',
    provider: 'OLLAMA',
    model: 'kimi-k2.7-code',
    toolDefinitions: [],
  };

  function callRuntime(callProvider: jest.Mock): Promise<{ content: string }> {
    const loop = new RuntimeV2LoopManager(
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      { callProvider } as never,
    );
    return (
      loop as unknown as {
        callRuntimeProvider: (
          bound: unknown,
          context: unknown,
          routingMode: string,
        ) => Promise<{ content: string }>;
      }
    ).callRuntimeProvider(binding, { systemPrompt: 'base' }, 'MANUAL_MODEL');
  }

  it('asks again when the provider returns nothing, rather than discarding the run', async () => {
    // A tool had already executed and its result was in hand when the
    // continuation came back empty; giving up there threw the work away.
    const callProvider = jest
      .fn()
      .mockRejectedValueOnce(
        new BusinessException(
          'Cloud provider OLLAMA returned no message content',
          'CLOUD_PROVIDER_EMPTY_RESPONSE',
        ),
      )
      .mockResolvedValueOnce({ content: 'The workspace has 7 rule files.' });

    await expect(callRuntime(callProvider)).resolves.toMatchObject({
      content: 'The workspace has 7 rule files.',
    });
    expect(callProvider).toHaveBeenCalledTimes(2);
  });

  it('gives up after the bounded retry rather than looping', async () => {
    const callProvider = jest
      .fn()
      .mockRejectedValue(
        new BusinessException(
          'Cloud provider OLLAMA returned no message content',
          'CLOUD_PROVIDER_EMPTY_RESPONSE',
        ),
      );

    await expect(callRuntime(callProvider)).rejects.toMatchObject({
      code: 'CLOUD_PROVIDER_EMPTY_RESPONSE',
    });
    expect(callProvider).toHaveBeenCalledTimes(RUNTIME_V2_EMPTY_RESPONSE_RETRIES + 1);
  });

  it('bounds what one turn may emit, instead of reserving the whole window', async () => {
    // With no cap the cloud lane fell back to the default written for
    // single-shot chat: reserve ctx - prompt - 256 for the answer, about 26,000
    // tokens. Around the tenth tool step Ollama stopped generating at all,
    // answering in under a second with done_reason=load and, decisively,
    // prompt_eval_count=0 — it never evaluated a prompt.
    const callProvider = jest.fn().mockResolvedValue({ content: 'Seven rule files.' });

    await callRuntime(callProvider);

    expect(callProvider.mock.calls[0]?.[7]).toMatchObject({
      maxOutputTokens: RUNTIME_V2_MAX_OUTPUT_TOKENS,
      fastPathEnabled: false,
      applyShortResponseConstraint: false,
    });
  });

  it('does not retry a failure that is not emptiness', async () => {
    const callProvider = jest
      .fn()
      .mockRejectedValue(new BusinessException('Unauthorized', 'OLLAMA_REQUEST_FAILED'));

    await expect(callRuntime(callProvider)).rejects.toMatchObject({
      code: 'OLLAMA_REQUEST_FAILED',
    });
    expect(callProvider).toHaveBeenCalledTimes(1);
  });
});
