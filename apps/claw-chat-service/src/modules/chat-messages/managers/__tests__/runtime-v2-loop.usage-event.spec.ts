import { type Mock, vi } from 'vitest';
import { RuntimeV2LoopManager } from '../runtime-v2-loop.manager';

/**
 * F108: each paid model call of a run publishes its settled cost, for PAYG only.
 *
 * `settledCostMicroUsd` only exists on a response when auth-service named the
 * user PAYG, so "subscribers never get a usage event" reduces to "no field, no
 * event". The other half is that the event must cover the run's WHOLE bill: the
 * ordinary turn and every repair turn are separate paid calls.
 */
describe('RuntimeV2LoopManager usage events (F108)', () => {
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
    generation: 'gen_1',
    provider: 'OPENAI',
    model: 'gpt-5',
    claimId: 'claim_0000001',
    epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
    toolDefinitions: [definition],
  };
  const validTool = JSON.stringify({
    kind: 'tool',
    toolName: 'workspace.files',
    toolVersion: '2.0.0',
    operation: 'list',
    arguments: { rootKey: 'workspace-1', path: '' },
    targetId: 'target:workspace',
  });

  // A request for a tool the run was never given: the repair turn exists for this.
  const wrongTool = validTool.replace('workspace.files', 'workspace.shell');

  type Internals = {
    callRuntimeProvider: (bound: unknown, ctx: unknown, mode: string) => Promise<unknown>;
    callWithRepair: (bound: unknown, ctx: unknown, mode: string) => Promise<unknown>;
  };

  function build(callProvider: Mock, appendUsage: Mock): Internals {
    return new RuntimeV2LoopManager(
      {} as never,
      {} as never,
      { appendUsage } as never,
      {} as never,
      { callProvider } as never,
    ) as unknown as Internals;
  }

  let appendUsage: Mock;

  beforeEach(() => {
    appendUsage = vi.fn().mockResolvedValue({ runId: 'run_1', sequence: 3, eventId: 'evt_1' });
  });

  it('publishes the settled cost of a PAYG turn, on the run claim', async () => {
    const callProvider = vi.fn().mockResolvedValue({ content: 'hi', settledCostMicroUsd: 21_000 });
    await build(callProvider, appendUsage).callRuntimeProvider(binding, {}, 'MANUAL_MODEL');

    expect(appendUsage).toHaveBeenCalledTimes(1);
    expect(appendUsage).toHaveBeenCalledWith(
      expect.objectContaining({ costMicros: 21_000, claimId: 'claim_0000001', runId: 'run_1' }),
    );
  });

  it('publishes a zero cost as zero', async () => {
    const callProvider = vi.fn().mockResolvedValue({ content: 'hi', settledCostMicroUsd: 0 });
    await build(callProvider, appendUsage).callRuntimeProvider(binding, {}, 'MANUAL_MODEL');
    expect(appendUsage).toHaveBeenCalledWith(expect.objectContaining({ costMicros: 0 }));
  });

  it('publishes nothing when the response carries no cost (subscriber, unknown, unmetered)', async () => {
    const callProvider = vi.fn().mockResolvedValue({ content: 'hi' });
    const response = await build(callProvider, appendUsage).callRuntimeProvider(
      binding,
      {},
      'MANUAL_MODEL',
    );
    expect(appendUsage).not.toHaveBeenCalled();
    expect(response).toEqual({ content: 'hi' });
  });

  it('publishes nothing when the binding has no claim to write under', async () => {
    const callProvider = vi.fn().mockResolvedValue({ content: 'hi', settledCostMicroUsd: 5 });
    const { claimId, ...unclaimed } = binding;
    void claimId;
    await build(callProvider, appendUsage).callRuntimeProvider(unclaimed, {}, 'MANUAL_MODEL');
    expect(appendUsage).not.toHaveBeenCalled();
  });

  it('never fails the turn when the journal write fails', async () => {
    appendUsage.mockRejectedValue(new Error('redis down'));
    const callProvider = vi.fn().mockResolvedValue({ content: 'hi', settledCostMicroUsd: 21_000 });
    await expect(
      build(callProvider, appendUsage).callRuntimeProvider(binding, {}, 'MANUAL_MODEL'),
    ).resolves.toMatchObject({ content: 'hi' });
  });

  it('reports the repair turn too, so the total is the whole bill', async () => {
    const callProvider = vi
      .fn()
      .mockResolvedValueOnce({ content: wrongTool, settledCostMicroUsd: 1_000 })
      .mockResolvedValueOnce({ content: validTool, settledCostMicroUsd: 500 });

    await build(callProvider, appendUsage).callWithRepair(
      binding,
      { systemPrompt: 'base' },
      'MANUAL_MODEL',
    );

    expect(callProvider).toHaveBeenCalledTimes(2);
    expect(
      appendUsage.mock.calls.map(([input]) => (input as { costMicros: number }).costMicros),
    ).toEqual([1_000, 500]);
  });

  it('gives every usage write its own idempotency key', async () => {
    const callProvider = vi
      .fn()
      .mockResolvedValueOnce({ content: wrongTool, settledCostMicroUsd: 1_000 })
      .mockResolvedValueOnce({ content: validTool, settledCostMicroUsd: 500 });
    await build(callProvider, appendUsage).callWithRepair(
      binding,
      { systemPrompt: 'base' },
      'MANUAL_MODEL',
    );
    const keys = appendUsage.mock.calls.map(
      ([input]) => (input as { idempotencyKey: string }).idempotencyKey,
    );
    expect(new Set(keys).size).toBe(2);
  });
  // The first turn is claimed inside executeClaimedRun, so the claim only exists
  // after the binding was resolved: it has to be threaded onto the binding the
  // model calls use, or the usage write has no claim to publish under.
  it('publishes the first turn cost on the claim taken for the run, before the answer and the terminal', async () => {
    const order: string[] = [];
    const { claimId, ...unclaimed } = binding;
    void claimId;
    const store = {
      claimRouted: vi.fn().mockResolvedValue({ claimed: true, claimId: 'claim_first_0001' }),
      markProviderDispatched: vi.fn().mockResolvedValue({}),
      appendUsage: vi.fn().mockImplementation(async () => {
        order.push('usage');
      }),
      appendModelOutput: vi.fn().mockImplementation(async () => {
        order.push('output');
      }),
      terminalize: vi.fn().mockImplementation(async () => {
        order.push('terminal');
      }),
    };
    const loop = new RuntimeV2LoopManager(
      { create: vi.fn().mockResolvedValue({}) } as never,
      { findById: vi.fn().mockResolvedValue({ userId: 'owner_1' }) } as never,
      store as never,
      { build: vi.fn().mockResolvedValue({ context: { systemPrompt: 'base' } }) } as never,
      {
        callProvider: vi.fn().mockResolvedValue({
          content:
            'The repository has three packages and each builds with the shared TypeScript config.',
          provider: 'OPENAI',
          model: 'gpt-5',
          latencyMs: 1,
          settledCostMicroUsd: 42_000,
        }),
      } as never,
    ) as unknown as {
      executeClaimedRun: (bound: unknown, payload: unknown) => Promise<void>;
    };

    await loop.executeClaimedRun(unclaimed, {
      messageId: 'message_1',
      selectedProvider: 'OPENAI',
      selectedModel: 'gpt-5',
      routingMode: 'MANUAL_MODEL',
    });

    expect(store.appendUsage).toHaveBeenCalledWith(
      expect.objectContaining({ costMicros: 42_000, claimId: 'claim_first_0001' }),
    );
    expect(order).toEqual(['usage', 'output', 'terminal']);
  });
});
