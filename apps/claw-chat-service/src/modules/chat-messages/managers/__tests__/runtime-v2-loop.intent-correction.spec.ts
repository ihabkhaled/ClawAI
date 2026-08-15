import { BusinessException } from '../../../../common/errors';
import {
  RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_CODE,
  RUNTIME_V2_TRANSIENT_PROVIDER_CODE,
  RUNTIME_V2_TRANSIENT_PROVIDER_RETRIES,
} from '../../constants/runtime-v2-failure.constants';
import { RUNTIME_V2_INTENT_CORRECTION_ATTEMPTS } from '../../utilities/runtime-v2-model-output.utility';
import { RuntimeV2LoopManager } from '../runtime-v2-loop.manager';

/**
 * A model that announces work and stops is asked to act — and the asking is
 * never allowed to fail quietly.
 *
 * `nudgeIntoActing` caught a failed correction with a bare `catch { return
 * latest }`. That abandoned the remaining attempts and stored the announcement
 * as the run's completed answer, logging nothing at all. A supervised run ended
 * on "Let me also check the existing test file content.", the extension
 * reported success, and the backend recorded `terminal: completed` with 180
 * characters. The guard against the silent stop had become the silent stop.
 *
 * Compounding it, the correction turn called the provider and parsed the reply
 * outside the repair path every other turn uses — and a correction instruction
 * is exactly what provokes a malformed tool request, so the throw it caused was
 * the throw being swallowed.
 */
describe('RuntimeV2LoopManager unfulfilled-intent correction', () => {
  const definition = {
    schemaVersion: '2.0',
    name: 'workspace.files',
    version: '2.0.0',
    description: 'Bounded workspace discovery.',
    operations: ['list'],
    riskClasses: ['inspect'],
    targetIds: ['target:workspace'],
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
  };
  const binding = {
    ownerId: 'owner_1',
    threadId: 'thread_1',
    messageId: 'message_1',
    runId: 'run_1',
    provider: 'OLLAMA',
    model: 'minimax-m2.7',
    epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
    toolDefinitions: [definition],
  };

  // The exact sentence that ended a supervised run.
  const ANNOUNCEMENT =
    'Now I have the full file content from the initial tool result. Let me also check the existing test file content.';

  function toolJson(): string {
    return JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: { rootKey: 'workspace-1', path: '' },
      targetId: 'target:workspace',
    });
  }

  function nudge(callProvider: jest.Mock): Promise<{ output: { kind: string } }> {
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
        ) => Promise<{ output: { kind: string } }>;
      }
    ).turnWithDriftCorrection(binding, { systemPrompt: 'base' }, 'MANUAL_MODEL', {
      response: { content: ANNOUNCEMENT },
      output: { kind: 'final', content: ANNOUNCEMENT },
    });
  }

  it('turns an announcement into the tool call it announced', async () => {
    const callProvider = jest.fn().mockResolvedValueOnce({ content: toolJson() });

    await expect(nudge(callProvider)).resolves.toMatchObject({ output: { kind: 'tool' } });
    expect(callProvider).toHaveBeenCalledTimes(1);
  });

  it('repairs a malformed correction instead of discarding the whole run', async () => {
    // The correction asks for a tool request, which is when a model is most
    // likely to produce a slightly wrong one. Inline parsing threw here, and
    // the caller swallowed it.
    const callProvider = jest
      .fn()
      .mockResolvedValueOnce({
        content: JSON.stringify({ kind: 'tool', toolName: 'workspace.shell' }),
      })
      .mockResolvedValueOnce({ content: toolJson() });

    await expect(nudge(callProvider)).resolves.toMatchObject({ output: { kind: 'tool' } });
  });

  it('keeps asking after a correction attempt fails outright', async () => {
    // One transient failure used to end every remaining attempt. The provider
    // fails once, then answers correctly, and the run must survive that.
    const callProvider = jest
      .fn()
      .mockRejectedValueOnce(new Error('connector unreachable'))
      .mockRejectedValueOnce(new Error('connector unreachable'))
      .mockResolvedValueOnce({ content: toolJson() });

    await expect(nudge(callProvider)).resolves.toMatchObject({ output: { kind: 'tool' } });
    expect(callProvider.mock.calls.length).toBeGreaterThan(1);
  });

  it('fails loudly, naming the last correction failure, rather than reporting success', async () => {
    const callProvider = jest.fn().mockRejectedValue(new Error('connector unreachable'));

    await expect(nudge(callProvider)).rejects.toMatchObject({
      code: RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_CODE,
    });
    await expect(nudge(callProvider)).rejects.toThrow(/connector unreachable/u);
  });

  it('spends every attempt it is given before giving up', async () => {
    const callProvider = jest.fn().mockRejectedValue(new Error('connector unreachable'));

    await expect(nudge(callProvider)).rejects.toBeDefined();
    // Each attempt calls the provider once; a repair only happens when a reply
    // arrives, and none does here.
    expect(callProvider).toHaveBeenCalledTimes(RUNTIME_V2_INTENT_CORRECTION_ATTEMPTS);
  });

  it('never accepts a second announcement as the answer', async () => {
    const callProvider = jest.fn().mockResolvedValue({ content: ANNOUNCEMENT });

    await expect(nudge(callProvider)).rejects.toMatchObject({
      code: RUNTIME_V2_ANNOUNCED_WITHOUT_ACTING_CODE,
    });
  });
});

/**
 * A provider that answers 500 has said nothing about the request. Ending the
 * run on it threw away every tool already executed — observed mid-task, with
 * sixteen tools admitted and an edit pending.
 */
describe('RuntimeV2LoopManager transient provider retry', () => {
  const binding = {
    ownerId: 'owner_1',
    threadId: 'thread_1',
    messageId: 'message_1',
    runId: 'run_1',
    provider: 'OLLAMA',
    model: 'glm-5.2',
    epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
    toolDefinitions: [],
  };

  function call(callProvider: jest.Mock): Promise<{ content: string }> {
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

  it('retries an unavailable provider and keeps the run', async () => {
    const callProvider = jest
      .fn()
      .mockRejectedValueOnce(
        new BusinessException('Internal Server Error', RUNTIME_V2_TRANSIENT_PROVIDER_CODE),
      )
      .mockResolvedValueOnce({ content: '{"kind":"final","content":"done"}' });

    await expect(call(callProvider)).resolves.toMatchObject({ content: expect.any(String) });
    expect(callProvider).toHaveBeenCalledTimes(2);
  });

  it('gives up after the configured retries rather than looping forever', async () => {
    const callProvider = jest
      .fn()
      .mockRejectedValue(
        new BusinessException('Internal Server Error', RUNTIME_V2_TRANSIENT_PROVIDER_CODE),
      );

    await expect(call(callProvider)).rejects.toMatchObject({
      code: RUNTIME_V2_TRANSIENT_PROVIDER_CODE,
    });
    expect(callProvider).toHaveBeenCalledTimes(RUNTIME_V2_TRANSIENT_PROVIDER_RETRIES + 1);
  });

  it('never retries a request the provider rejected', async () => {
    // A 4xx is the same failure every time; retrying only makes the error slower.
    const callProvider = jest
      .fn()
      .mockRejectedValue(new BusinessException('Bad request', 'CLOUD_PROVIDER_REQUEST_FAILED'));

    await expect(call(callProvider)).rejects.toBeDefined();
    expect(callProvider).toHaveBeenCalledTimes(1);
  });
});
