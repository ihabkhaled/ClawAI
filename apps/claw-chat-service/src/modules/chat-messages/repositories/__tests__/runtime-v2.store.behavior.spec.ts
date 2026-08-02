import { describe, expect, it } from '@jest/globals';

import type {
  RuntimeResultDto,
  RuntimeStartDto,
  RuntimeSteeringDto,
  ToolInvocationDto,
} from '../../dto/runtime-v2.dto';
import { runtimeV2Sha256, stableRuntimeV2Json } from '../../utilities/runtime-v2-identity.utility';
import { runtimeV2KeyFamily } from '../../utilities/runtime-v2-key.utility';
import { RuntimeV2Store } from '../runtime-v2.store';
import { RuntimeV2RedisStateMachine } from './runtime-v2-redis-state-machine.fake';

const epochs = { account: 1, workspace: 2, target: 3, policy: 4 };
const hash = `sha256:${'a'.repeat(64)}`;
const toolDefinitions = [
  {
    schemaVersion: '2.0' as const,
    name: 'workspace.read',
    version: '1.0.0',
    description: 'Read a bounded fixture.',
    operations: ['read'],
    riskClasses: ['inspect' as const],
    targetIds: ['runtime_target_00001'],
    inputSchema: { type: 'object', additionalProperties: false },
  },
];
const ownerId = 'runtime_owner_000001';
const messageId = 'runtime_message_0001';
const threadId = 'runtime_thread_00001';

function startRequest(prompt = 'Inspect the safe fixture.'): RuntimeStartDto {
  return {
    schemaVersion: '2.0',
    threadId,
    clientRequestId: 'runtime_request_00001',
    idempotencyKey: 'runtime_idempotency_1',
    prompt,
    manifestHash: hash,
    toolCatalogHash: runtimeV2Sha256(JSON.stringify(toolDefinitions)),
    toolDefinitions,
    provider: 'OLLAMA',
    model: 'qwen3:1.7b',
    epochs,
    budget: {
      maxModelTurns: 4,
      maxToolCalls: 4,
      maxToolRounds: 2,
      maxRepairAttempts: 1,
      maxRuntimeMs: 60_000,
      maxOutputBytes: 65_536,
      maxToolResultBytes: 32_768,
    },
  };
}

function invocation(runId: string, suffix: string): ToolInvocationDto {
  return {
    schemaVersion: '2.0',
    invocationId: `runtime_invocation_${suffix}`,
    runId,
    turnId: `runtime_turn_${suffix}000000`,
    toolName: 'workspace.read',
    toolVersion: '1.0.0',
    operation: 'read',
    arguments: { pathHandle: `opaque_handle_${suffix}` },
    targetId: 'runtime_target_00001',
    epochs,
    idempotencyKey: `runtime_invoke_key_${suffix}`,
    requestedAt: '2026-08-02T10:00:00.000Z',
  };
}

function result(invocationId: string, value = true): RuntimeResultDto {
  const canonical = stableRuntimeV2Json({
    error: null,
    modelText: null,
    structured: { ok: value },
  });
  return {
    generation: 'placeholder_generation',
    idempotencyKey: `runtime_result_${invocationId}`,
    epochs,
    result: {
      schemaVersion: '2.0',
      invocationId,
      status: 'succeeded',
      structured: { ok: value },
      receipt: {
        schemaVersion: '2.0',
        receiptId: `receipt_${invocationId}`,
        invocationId,
        argumentHash: runtimeV2Sha256(stableRuntimeV2Json({ pathHandle: 'opaque_handle_0001' })),
        resultHash: runtimeV2Sha256(canonical),
        startedAt: '2026-08-02T10:00:00.000Z',
        completedAt: '2026-08-02T10:00:01.000Z',
        durationMs: 1_000,
        outputBytes: new TextEncoder().encode(canonical).byteLength,
        truncated: false,
        redactionApplied: false,
      },
      continuation: { action: 'final' },
    },
  };
}

async function started(machine: RuntimeV2RedisStateMachine): Promise<{
  readonly store: RuntimeV2Store;
  readonly bound: {
    readonly ownerId: string;
    readonly threadId: string;
    readonly messageId: string;
    readonly clientRequestId: string;
    readonly startIdempotencyKey: string;
    readonly manifestHash: string;
    readonly toolCatalogHash: string;
    readonly toolDefinitions: typeof toolDefinitions;
    readonly provider: string;
    readonly model: string;
    readonly runId: string;
    readonly generation: string;
    readonly epochs: typeof epochs;
    readonly ttlSeconds: number;
  };
}> {
  const store = new RuntimeV2Store(machine);
  const acknowledgement = await store.start({
    ownerId,
    messageId,
    request: startRequest(),
    ttlSeconds: 900,
  });
  return {
    store,
    bound: {
      ownerId,
      threadId,
      messageId,
      clientRequestId: startRequest().clientRequestId,
      startIdempotencyKey: startRequest().idempotencyKey,
      manifestHash: startRequest().manifestHash,
      toolCatalogHash: startRequest().toolCatalogHash,
      toolDefinitions,
      provider: startRequest().provider,
      model: startRequest().model,
      runId: acknowledgement.runId,
      generation: acknowledgement.generation,
      epochs,
      ttlSeconds: 900,
    },
  };
}

describe('RuntimeV2Store atomic behavior', () => {
  it('makes concurrent start replay exact and inert while conflicts mutate nothing', async () => {
    const machine = new RuntimeV2RedisStateMachine();
    const firstStore = new RuntimeV2Store(machine);
    const secondStore = new RuntimeV2Store(machine);
    const input = { ownerId, messageId, request: startRequest(), ttlSeconds: 900 };

    const [first, second] = await Promise.all([firstStore.start(input), secondStore.start(input)]);
    expect(first.runId).toBe(second.runId);
    expect([first.replayed, second.replayed].sort()).toEqual([false, true]);
    const stateKey = runtimeV2KeyFamily(first.runId).state;
    const before = machine.snapshot(stateKey);
    machine.advance(1_000);
    const replay = await firstStore.start(input);
    expect(replay).toEqual({ ...first, replayed: true });
    expect(machine.snapshot(stateKey)).toEqual(before);
    await expect(
      firstStore.start({ ...input, request: startRequest('Changed prompt') }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });
    await expect(
      secondStore.start({
        ...input,
        messageId: 'runtime_message_client_conflict',
        request: {
          ...startRequest('Changed owner-scoped client request body'),
          idempotencyKey: 'runtime_idempotency_client_conflict',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });
    expect(machine.snapshot(stateKey)).toEqual(before);
  });

  it('allocates contiguous canonical event sequences across store instances', async () => {
    const machine = new RuntimeV2RedisStateMachine();
    const { store, bound } = await started(machine);
    const secondStore = new RuntimeV2Store(machine);

    const acknowledgements = await Promise.all([
      store.admitInvocation({ ...bound, invocation: invocation(bound.runId, '0001') }),
      secondStore.admitInvocation({ ...bound, invocation: invocation(bound.runId, '0002') }),
    ]);
    expect(acknowledgements.map((ack) => ack.sequence).sort()).toEqual([2, 4]);
    const replay = await store.readEvents({ ...bound, after: 0 });
    expect(replay.events.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);
    expect(replay.events.every((event) => event.sequence > 0 && event.runId === bound.runId)).toBe(
      true,
    );
  });

  it('deduplicates results once and denies conflicts, unknown invocations and late results', async () => {
    const machine = new RuntimeV2RedisStateMachine();
    const { store, bound } = await started(machine);
    const call = invocation(bound.runId, '0001');
    await store.admitInvocation({ ...bound, invocation: call });
    const command = { ...result(call.invocationId), generation: bound.generation };

    const first = await store.submitResult({ ...bound, command });
    const beforeReplay = machine.snapshot(runtimeV2KeyFamily(bound.runId).state);
    const replay = await store.submitResult({ ...bound, command });
    expect(replay).toEqual({ ...first, replayed: true });
    expect(machine.snapshot(runtimeV2KeyFamily(bound.runId).state)).toEqual(beforeReplay);
    await expect(
      store.submitResult({
        ...bound,
        command: {
          ...result(call.invocationId, false),
          generation: bound.generation,
          idempotencyKey: command.idempotencyKey,
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });
    const unknown = { ...result('runtime_invocation_9999'), generation: bound.generation };
    await expect(store.submitResult({ ...bound, command: unknown })).rejects.toMatchObject({
      code: 'RUNTIME_RUN_NOT_FOUND',
    });
    await store.cancel({
      ...bound,
      command: {
        generation: bound.generation,
        idempotencyKey: 'runtime_cancel_key_1',
        epochs,
        requestedAt: '2026-08-02T10:00:03.000Z',
      },
    });
    await expect(
      store.submitResult({
        ...bound,
        command: {
          ...result(call.invocationId),
          generation: bound.generation,
          idempotencyKey: 'runtime_result_late1',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });
  });

  it('requires steering FIFO and keeps exact steering replay inert', async () => {
    const machine = new RuntimeV2RedisStateMachine();
    const { store, bound } = await started(machine);
    const steering = (sequence: number, suffix: string): RuntimeSteeringDto => ({
      generation: bound.generation,
      steering: {
        schemaVersion: '2.0',
        steeringId: `runtime_steering_${suffix}`,
        runId: bound.runId,
        sequence,
        idempotencyKey: `runtime_steer_key_${suffix}`,
        message: 'Use the safe path.',
        epochs,
        receivedAt: '2026-08-02T10:00:02.000Z',
      },
    });
    await expect(
      store.submitSteering({ ...bound, command: steering(1, '0002') }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });
    const first = await store.submitSteering({ ...bound, command: steering(0, '0001') });
    const replay = await store.submitSteering({ ...bound, command: steering(0, '0001') });
    expect(replay).toEqual({ ...first, replayed: true });
    await store.submitSteering({ ...bound, command: steering(1, '0002') });
    expect(machine.snapshot(runtimeV2KeyFamily(bound.runId).state)?.sequence).toBe(2);
  });

  it('claims routed work once and permits exactly one terminal transition', async () => {
    const machine = new RuntimeV2RedisStateMachine();
    const { store, bound } = await started(machine);
    const claimInput = {
      ...bound,
      messageId,
      provider: 'OLLAMA',
      model: 'qwen3:1.7b',
      deliveryId: 'runtime_delivery_0001',
    };
    const claim = await store.claimRouted(claimInput);
    expect(claim.claimed).toBe(true);
    const replay = await store.claimRouted(claimInput);
    expect(replay.replayed).toBe(true);
    await expect(
      store.claimRouted({ ...claimInput, deliveryId: 'runtime_delivery_0002' }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });
    const dispatchInput = {
      ...bound,
      claimId: claim.claimId,
      idempotencyKey: 'runtime_dispatch_key1',
      dispatchedAt: '2026-08-02T10:00:03.500Z',
    };
    const dispatch = await store.markProviderDispatched(dispatchInput);
    expect(await store.markProviderDispatched(dispatchInput)).toEqual({
      ...dispatch,
      replayed: true,
    });
    await expect(
      store.markProviderDispatched({ ...dispatchInput, idempotencyKey: 'runtime_dispatch_key2' }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });
    const terminalInput = {
      ...bound,
      claimId: claim.claimId,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'completed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
    };
    const terminal = await store.terminalize(terminalInput);
    expect(await store.terminalize(terminalInput)).toEqual({ ...terminal, replayed: true });
    await expect(
      store.cancel({
        ...bound,
        command: {
          generation: bound.generation,
          idempotencyKey: 'runtime_cancel_key_1',
          epochs,
          requestedAt: '2026-08-02T10:00:05.000Z',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });
  });

  it('fails closed for stale identity, expiry, state loss and Redis outage', async () => {
    const machine = new RuntimeV2RedisStateMachine();
    const { store, bound } = await started(machine);
    const cancel = {
      generation: bound.generation,
      idempotencyKey: 'runtime_cancel_key_1',
      epochs,
      requestedAt: '2026-08-02T10:00:03.000Z',
    };
    await expect(
      store.cancel({ ...bound, ownerId: 'runtime_foreign_001', command: cancel }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
    await expect(
      store.cancel({
        ...bound,
        epochs: { ...epochs, policy: 5 },
        command: { ...cancel, epochs: { ...epochs, policy: 5 } },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
    machine.loseAllState();
    await expect(store.cancel({ ...bound, command: cancel })).rejects.toMatchObject({
      code: 'RUNTIME_RUN_NOT_FOUND',
    });
    expect(machine.snapshot(runtimeV2KeyFamily(bound.runId).state)).toBeUndefined();
    machine.setUnavailable(true);
    await expect(store.cancel({ ...bound, command: cancel })).rejects.toMatchObject({
      code: 'RUNTIME_STATE_UNAVAILABLE',
      message: 'Runtime state is unavailable',
    });
  });
});
