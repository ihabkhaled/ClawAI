import { describe, expect, it, vi } from 'vitest';

import type {
  RuntimeResultDto,
  RuntimeStartDto,
  ToolInvocationDto,
} from '../../dto/runtime-v2.dto';
import { RuntimeV2RedisStateMachine } from '../../repositories/__tests__/runtime-v2-redis-state-machine.fake';
import { RuntimeV2Store } from '../../repositories/runtime-v2.store';
import { ZeroRetentionMarkerStore } from '../../repositories/zero-retention-marker.store';
import { ZeroRetentionRepository } from '../../repositories/zero-retention.repository';
import type { RuntimeV2BoundInput } from '../../types/runtime-v2-store.types';
import type {
  ZeroRetentionPrismaPort,
  ZeroRetentionRedisPort,
} from '../../types/zero-retention.types';
import { runtimeV2Sha256, stableRuntimeV2Json } from '../../utilities/runtime-v2-identity.utility';
import { ZeroRetentionService } from '../zero-retention.service';

/**
 * F055 (c): a zero-retention Runtime V2 run keeps its transcript for as long
 * as it is running (the loop re-reads it between tool calls) and loses its
 * content only once the run is terminal. Driven through the real store over
 * the Redis state-machine fake, so the purge hangs off the real terminal
 * transition, not a stub of it.
 */
const epochs = { account: 1, workspace: 2, target: 3, policy: 4 };
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

function startRequest(): RuntimeStartDto {
  return {
    schemaVersion: '2.0',
    threadId,
    clientRequestId: 'runtime_request_00001',
    idempotencyKey: 'runtime_idempotency_1',
    prompt: 'Inspect the safe fixture.',
    manifestHash: `sha256:${'a'.repeat(64)}`,
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

function invocation(runId: string): ToolInvocationDto {
  return {
    schemaVersion: '2.0',
    invocationId: 'runtime_invocation_0001',
    runId,
    turnId: 'runtime_turn_0001000000',
    toolName: 'workspace.read',
    toolVersion: '1.0.0',
    operation: 'read',
    arguments: { pathHandle: 'opaque_handle_0001' },
    targetId: 'runtime_target_00001',
    epochs,
    idempotencyKey: 'runtime_invoke_key_0001',
    requestedAt: '2026-08-02T10:00:00.000Z',
  };
}

function result(invocationId: string, generation: string): RuntimeResultDto {
  const canonical = stableRuntimeV2Json({ error: null, modelText: null, structured: { ok: true } });
  return {
    generation,
    idempotencyKey: `runtime_result_${invocationId}`,
    epochs,
    result: {
      schemaVersion: '2.0',
      invocationId,
      status: 'succeeded',
      structured: { ok: true },
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
      continuation: { action: 'continue', nextTurnId: 'runtime_turn_0002000000' },
    },
  };
}

interface Run {
  readonly store: RuntimeV2Store;
  readonly bound: RuntimeV2BoundInput;
  readonly claimId: string;
  readonly findMany: ReturnType<typeof vi.fn<ZeroRetentionPrismaPort['chatMessage']['findMany']>>;
  readonly update: ReturnType<typeof vi.fn<ZeroRetentionPrismaPort['chatMessage']['update']>>;
}

async function startedRun(zeroRetention: boolean): Promise<Run> {
  const store = new RuntimeV2Store(new RuntimeV2RedisStateMachine());
  const markers = new Map<string, string>();
  const redis: ZeroRetentionRedisPort = {
    get: async (key) => markers.get(key) ?? null,
    set: async (key, value) => {
      markers.set(key, value);
    },
  };
  const findMany = vi.fn<ZeroRetentionPrismaPort['chatMessage']['findMany']>(async () => [
    { id: 'prompt', metadata: { runtimeV2: { runId: 'x' } } },
    { id: 'tool-request', metadata: { runtimeV2: { runId: 'x', kind: 'tool-request' } } },
    { id: 'answer', metadata: { runtimeV2: { runId: 'x' } } },
  ]);
  const update = vi.fn<ZeroRetentionPrismaPort['chatMessage']['update']>(async () => ({}));
  const service = new ZeroRetentionService(
    new ZeroRetentionMarkerStore(redis),
    new ZeroRetentionRepository({ chatMessage: { findMany, update } }),
    store,
  );
  service.onModuleInit();

  const request = startRequest();
  const ack = await store.start({ ownerId, messageId, request, ttlSeconds: 900 });
  if (zeroRetention) await service.markRuntimeRun(ack.runId);
  const bound: RuntimeV2BoundInput = {
    ownerId,
    threadId,
    messageId,
    clientRequestId: request.clientRequestId,
    startIdempotencyKey: request.idempotencyKey,
    manifestHash: request.manifestHash,
    toolCatalogHash: request.toolCatalogHash,
    toolDefinitions,
    provider: request.provider,
    model: request.model,
    runId: ack.runId,
    generation: ack.generation,
    epochs,
    ttlSeconds: 900,
  };
  const claim = await store.claimRouted({
    ...bound,
    messageId,
    provider: 'OLLAMA',
    model: 'qwen3:1.7b',
    deliveryId: 'runtime_delivery_0001',
  });
  return { store, bound, claimId: claim.claimId, findMany, update };
}

/** Lets the fire-and-forget listener finish. */
async function settle(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe('zero retention across a Runtime V2 run', () => {
  it('purges nothing while the run is working, then everything once it completes', async () => {
    const run = await startedRun(true);
    const call = invocation(run.bound.runId);

    await run.store.admitInvocation({ ...run.bound, invocation: call });
    await run.store.submitResult({
      ...run.bound,
      command: result(call.invocationId, run.bound.generation),
    });
    await settle();
    // Mid-run: the loop is about to re-read this transcript for its next turn.
    expect(run.findMany).not.toHaveBeenCalled();
    expect(run.update).not.toHaveBeenCalled();

    const terminal = await run.store.terminalize({
      ...run.bound,
      claimId: run.claimId,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'completed',
      completedAt: '2026-08-02T10:00:04.000Z',
    });
    await settle();

    // The run itself completed normally; the purge rides on it.
    expect(terminal.replayed).toBe(false);
    expect(run.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { threadId, metadata: { path: ['runtimeV2', 'runId'], equals: run.bound.runId } },
      }),
    );
    expect(run.update.mock.calls.map(([args]) => args.where.id)).toEqual([
      'prompt',
      'tool-request',
      'answer',
    ]);
  });

  it('purges a cancelled run', async () => {
    const run = await startedRun(true);

    await run.store.cancel({
      ...run.bound,
      command: {
        generation: run.bound.generation,
        idempotencyKey: 'runtime_cancel_key_1',
        epochs,
        requestedAt: '2026-08-02T10:00:05.000Z',
      },
    });
    await settle();
    expect(run.update).toHaveBeenCalledTimes(3);
  });

  it('keeps a paused run intact so it can resume', async () => {
    const run = await startedRun(true);

    await run.store.terminalize({
      ...run.bound,
      claimId: run.claimId,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'paused',
      completedAt: '2026-08-02T10:00:04.000Z',
    });
    await settle();
    expect(run.findMany).not.toHaveBeenCalled();
  });

  it('changes nothing for a run that did not ask for zero retention', async () => {
    const run = await startedRun(false);

    await run.store.terminalize({
      ...run.bound,
      claimId: run.claimId,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'completed',
      completedAt: '2026-08-02T10:00:04.000Z',
    });
    await settle();
    expect(run.findMany).not.toHaveBeenCalled();
    expect(run.update).not.toHaveBeenCalled();
  });
});
