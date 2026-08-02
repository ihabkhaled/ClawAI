import { describe, expect, it } from '@jest/globals';

import { RuntimeV2RedisOperation } from '../../../../infrastructure/redis/enums/runtime-v2-redis-operation.enum';
import type {
  RuntimeV2RedisCommand,
  RuntimeV2RedisPort,
} from '../../../../infrastructure/redis/types/redis-client.types';
import type { RuntimeStartDto } from '../../dto/runtime-v2.dto';
import { runtimeV2Sha256, stableRuntimeV2Json } from '../../utilities/runtime-v2-identity.utility';
import { RuntimeV2Store } from '../runtime-v2.store';

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
const startRequest: RuntimeStartDto = {
  schemaVersion: '2.0',
  threadId: 'runtime_thread_00001',
  clientRequestId: 'runtime_request_00001',
  idempotencyKey: 'runtime_idempotency_1',
  prompt: 'Inspect the safe fixture.',
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

class QueueRedis implements RuntimeV2RedisPort {
  readonly commands: RuntimeV2RedisCommand[] = [];
  readonly replies: unknown[] = [];
  failure: Error | undefined;

  async executeRuntimeV2(command: RuntimeV2RedisCommand): Promise<unknown> {
    this.commands.push(command);
    if (this.failure !== undefined) throw this.failure;
    return this.replies.shift();
  }
}

const startReply = (runId: string, generation: string): readonly [string, string] => [
  'OK',
  JSON.stringify({ runId, generation, messageId: 'runtime_message_0001', sequence: 0 }),
];

describe('RuntimeV2Store', () => {
  it('rejects a tool catalog whose digest does not match the admitted hash', async () => {
    const redis = new QueueRedis();
    await expect(
      new RuntimeV2Store(redis).start({
        ownerId: 'runtime_owner_000001',
        messageId: 'runtime_message_0001',
        request: { ...startRequest, toolCatalogHash: hash },
        ttlSeconds: 900,
      }),
    ).rejects.toThrow('tool catalog hash');
    expect(redis.commands).toHaveLength(0);
  });

  it('follows the stored random identity on a concurrent-start redirect', async () => {
    const redis = new QueueRedis();
    const ack = JSON.stringify({
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      messageId: 'runtime_message_0001',
      sequence: 0,
    });
    redis.replies.push(['REDIRECT', ack], ['REPLAY', ack]);
    const result = await new RuntimeV2Store(redis).start({
      ownerId: 'runtime_owner_000001',
      messageId: 'runtime_message_0001',
      request: startRequest,
      ttlSeconds: 900,
    });

    expect(result).toMatchObject({ runId: 'runtime_run_existing1', replayed: true });
    expect(redis.commands).toHaveLength(2);
    expect(redis.commands[1]?.keys.join(':')).toContain('runtime_run_existing1');
  });

  it('starts with server-generated 128-bit identities and one cluster-safe key family', async () => {
    const redis = new QueueRedis();
    redis.replies.push(startReply('runtime_run_existing1', 'runtime_generation_1'));
    const store = new RuntimeV2Store(redis);

    const acknowledgement = await store.start({
      ownerId: 'runtime_owner_000001',
      messageId: 'runtime_message_0001',
      request: startRequest,
      ttlSeconds: 900,
    });

    expect(acknowledgement).toEqual({
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      messageId: 'runtime_message_0001',
      sequence: 0,
      replayed: false,
    });
    const command = redis.commands[0];
    expect(command?.operation).toBe(RuntimeV2RedisOperation.START);
    expect(command?.keys.length).toBeGreaterThanOrEqual(3);
    expect(command?.keys.every((key) => key.includes('{runtime-v2}'))).toBe(true);
    const proposed = JSON.parse(command?.arguments[1] ?? '{}');
    expect(proposed.runId).toMatch(/^run_[a-f0-9]{32,}$/u);
    expect(proposed.generation).toMatch(/^gen_[a-f0-9]{32,}$/u);
    expect(proposed.runId).not.toBe(proposed.generation);
  });

  it('returns exact replay acknowledgement without changing its identity', async () => {
    const redis = new QueueRedis();
    const ack = JSON.stringify({
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      messageId: 'runtime_message_0001',
      sequence: 0,
    });
    redis.replies.push(['REPLAY', ack], ['REPLAY', ack]);
    const firstStore = new RuntimeV2Store(redis);
    const secondStore = new RuntimeV2Store(redis);

    const first = await firstStore.start({
      ownerId: 'runtime_owner_000001',
      messageId: 'runtime_message_0001',
      request: startRequest,
      ttlSeconds: 900,
    });
    const second = await secondStore.start({
      ownerId: 'runtime_owner_000001',
      messageId: 'runtime_message_0001',
      request: startRequest,
      ttlSeconds: 900,
    });

    expect(first).toEqual(second);
    expect(first.replayed).toBe(true);
  });

  it('maps conflicts, missing state, terminal state and Redis loss to safe stable failures', async () => {
    const redis = new QueueRedis();
    const store = new RuntimeV2Store(redis);
    redis.replies.push(['CONFLICT', 'START_REPLAY_CONFLICT']);
    await expect(
      store.start({
        ownerId: 'runtime_owner_000001',
        messageId: 'runtime_message_0001',
        request: startRequest,
        ttlSeconds: 900,
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });

    redis.replies.push(['MISSING', 'STALE_RUN']);
    await expect(
      store.cancel({
        ownerId: 'runtime_owner_000001',
        threadId: startRequest.threadId,
        messageId: 'runtime_message_0001',
        clientRequestId: startRequest.clientRequestId,
        startIdempotencyKey: startRequest.idempotencyKey,
        runId: 'runtime_run_existing1',
        generation: 'runtime_generation_1',
        epochs,
        manifestHash: startRequest.manifestHash,
        toolCatalogHash: startRequest.toolCatalogHash,
        toolDefinitions,
        provider: startRequest.provider,
        model: startRequest.model,
        ttlSeconds: 900,
        command: {
          generation: 'runtime_generation_1',
          idempotencyKey: 'runtime_cancel_key_1',
          epochs,
          requestedAt: '2026-08-02T10:00:00.000Z',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });

    redis.failure = new Error('raw redis secret');
    await expect(
      store.start({
        ownerId: 'runtime_owner_000001',
        messageId: 'runtime_message_0001',
        request: startRequest,
        ttlSeconds: 900,
      }),
    ).rejects.toMatchObject({
      code: 'RUNTIME_STATE_UNAVAILABLE',
      message: 'Runtime state is unavailable',
    });
  });

  it('uses atomic operations for invocation, result, steering, cancellation, claim and terminalization', async () => {
    const redis = new QueueRedis();
    const mutation = JSON.stringify({
      runId: 'runtime_run_existing1',
      sequence: 2,
      eventId: 'runtime_event_00001',
    });
    const claim = JSON.stringify({
      runId: 'runtime_run_existing1',
      sequence: 3,
      eventId: 'runtime_event_00002',
      claimId: 'runtime_claim_00001',
    });
    redis.replies.push(
      ['OK', mutation],
      ['OK', mutation],
      ['OK', mutation],
      ['OK', mutation],
      ['CLAIMED', claim],
      ['OK', mutation],
      ['OK', mutation],
    );
    const store = new RuntimeV2Store(redis);
    const bound = {
      ownerId: 'runtime_owner_000001',
      threadId: startRequest.threadId,
      messageId: 'runtime_message_0001',
      clientRequestId: startRequest.clientRequestId,
      startIdempotencyKey: startRequest.idempotencyKey,
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs,
      manifestHash: startRequest.manifestHash,
      toolCatalogHash: startRequest.toolCatalogHash,
      toolDefinitions,
      provider: startRequest.provider,
      model: startRequest.model,
      ttlSeconds: 900,
    };
    const invocation = {
      schemaVersion: '2.0' as const,
      invocationId: 'runtime_invocation_1',
      runId: bound.runId,
      turnId: 'runtime_turn_0000001',
      toolName: 'workspace.read',
      toolVersion: '1.0.0',
      operation: 'read',
      arguments: { pathHandle: 'opaque_handle_0001' },
      targetId: 'runtime_target_00001',
      epochs,
      idempotencyKey: 'runtime_invoke_key_1',
      requestedAt: '2026-08-02T10:00:00.000Z',
    };
    const resultCanonical = stableRuntimeV2Json({
      error: null,
      modelText: null,
      structured: { ok: true },
    });
    await store.admitInvocation({ ...bound, invocation });
    await store.submitResult({
      ...bound,
      command: {
        generation: bound.generation,
        idempotencyKey: 'runtime_result_key_1',
        epochs,
        result: {
          schemaVersion: '2.0',
          invocationId: invocation.invocationId,
          status: 'succeeded',
          structured: { ok: true },
          receipt: {
            schemaVersion: '2.0',
            receiptId: 'runtime_receipt_0001',
            invocationId: invocation.invocationId,
            argumentHash: runtimeV2Sha256(stableRuntimeV2Json(invocation.arguments)),
            resultHash: runtimeV2Sha256(resultCanonical),
            startedAt: '2026-08-02T10:00:00.000Z',
            completedAt: '2026-08-02T10:00:01.000Z',
            durationMs: 1_000,
            outputBytes: new TextEncoder().encode(resultCanonical).byteLength,
            truncated: false,
            redactionApplied: false,
          },
          continuation: { action: 'final' },
        },
      },
    });
    await store.submitSteering({
      ...bound,
      command: {
        generation: bound.generation,
        steering: {
          schemaVersion: '2.0',
          steeringId: 'runtime_steering_001',
          runId: bound.runId,
          sequence: 0,
          idempotencyKey: 'runtime_steer_key_1',
          message: 'Use the safe path.',
          epochs,
          receivedAt: '2026-08-02T10:00:02.000Z',
        },
      },
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
    await store.claimRouted({
      ...bound,
      messageId: 'runtime_message_0001',
      provider: 'OLLAMA',
      model: 'qwen3:1.7b',
      deliveryId: 'runtime_delivery_0001',
    });
    await store.markProviderDispatched({
      ...bound,
      claimId: 'runtime_claim_00001',
      idempotencyKey: 'runtime_dispatch_key1',
      dispatchedAt: '2026-08-02T10:00:03.500Z',
    });
    await store.terminalize({
      ...bound,
      claimId: 'runtime_claim_00001',
      idempotencyKey: 'runtime_terminal_key1',
      status: 'completed',
      completedAt: '2026-08-02T10:00:04.000Z',
    });

    expect(redis.commands.map((command) => command.operation)).toEqual([
      RuntimeV2RedisOperation.ADMIT_INVOCATION,
      RuntimeV2RedisOperation.RESULT,
      RuntimeV2RedisOperation.STEERING,
      RuntimeV2RedisOperation.CANCEL,
      RuntimeV2RedisOperation.CLAIM_ROUTED,
      RuntimeV2RedisOperation.MARK_DISPATCHED,
      RuntimeV2RedisOperation.TERMINAL,
    ]);
  });

  it('reads only cursor-following bounded events through the atomic binding check', async () => {
    const redis = new QueueRedis();
    redis.replies.push([
      'OK',
      JSON.stringify({
        runId: 'runtime_run_existing1',
        terminal: false,
        events: [
          JSON.stringify({
            schemaVersion: '2.0',
            runId: 'runtime_run_existing1',
            sequence: 4,
            type: 'tool.completed',
            eventId: 'runtime_event_00004',
            timestamp: '2026-08-02T10:00:04.000Z',
            visibility: 'user',
            sensitivity: 'workspace',
            epochs,
            payload: { status: 'succeeded' },
          }),
        ],
      }),
    ]);
    const store = new RuntimeV2Store(redis);
    const result = await store.readEvents({
      ownerId: 'runtime_owner_000001',
      threadId: startRequest.threadId,
      messageId: 'runtime_message_0001',
      clientRequestId: startRequest.clientRequestId,
      startIdempotencyKey: startRequest.idempotencyKey,
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs,
      manifestHash: startRequest.manifestHash,
      toolCatalogHash: startRequest.toolCatalogHash,
      toolDefinitions,
      provider: startRequest.provider,
      model: startRequest.model,
      ttlSeconds: 900,
      after: 3,
    });

    expect(result.events.map((event) => event.sequence)).toEqual([4]);
    expect(redis.commands[0]?.operation).toBe(RuntimeV2RedisOperation.READ_EVENTS);
  });

  it('resolves a complete bound run through the atomic state authority', async () => {
    const redis = new QueueRedis();
    const mapped = {
      ownerId: 'runtime_owner_000001',
      threadId: startRequest.threadId,
      messageId: 'runtime_message_0001',
      clientRequestId: startRequest.clientRequestId,
      startIdempotencyKey: startRequest.idempotencyKey,
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs,
      manifestHash: startRequest.manifestHash,
      toolCatalogHash: startRequest.toolCatalogHash,
      toolDefinitions,
      provider: startRequest.provider,
      model: startRequest.model,
    };
    redis.replies.push(['OK', JSON.stringify(mapped)]);

    const binding = await new RuntimeV2Store(redis).resolveBinding({
      ownerId: mapped.ownerId,
      threadId: mapped.threadId,
      runId: mapped.runId,
      generation: mapped.generation,
      ttlSeconds: 900,
    });

    expect(binding).toEqual({ ...mapped, ttlSeconds: 900 });
    expect(redis.commands[0]?.operation).toBe(RuntimeV2RedisOperation.READ_BINDING);
    expect(redis.commands[0]?.arguments).toEqual([
      mapped.ownerId,
      mapped.threadId,
      mapped.runId,
      mapped.generation,
    ]);
  });

  it('resolves a routed message index and revalidates its bound run', async () => {
    const redis = new QueueRedis();
    const mapped = {
      ownerId: 'runtime_owner_000001',
      threadId: startRequest.threadId,
      messageId: 'runtime_message_0001',
      clientRequestId: startRequest.clientRequestId,
      startIdempotencyKey: startRequest.idempotencyKey,
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs,
      manifestHash: startRequest.manifestHash,
      toolCatalogHash: startRequest.toolCatalogHash,
      toolDefinitions,
      provider: startRequest.provider,
      model: startRequest.model,
    };
    redis.replies.push(['OK', JSON.stringify(mapped)], ['OK', JSON.stringify(mapped)]);

    const binding = await new RuntimeV2Store(redis).resolveMessageBinding({
      messageId: mapped.messageId,
      threadId: mapped.threadId,
      provider: mapped.provider,
      model: mapped.model,
      ttlSeconds: 900,
    });

    expect(binding).toEqual({ ...mapped, ttlSeconds: 900 });
    expect(redis.commands.map(({ operation }) => operation)).toEqual([
      RuntimeV2RedisOperation.READ_MESSAGE_BINDING,
      RuntimeV2RedisOperation.READ_BINDING,
    ]);
  });

  it('rejects forged authority, invalid receipts and TTLs before Redis mutation', async () => {
    const redis = new QueueRedis();
    const store = new RuntimeV2Store(redis);
    const bound = {
      ownerId: 'runtime_owner_000001',
      threadId: startRequest.threadId,
      messageId: 'runtime_message_0001',
      clientRequestId: startRequest.clientRequestId,
      startIdempotencyKey: startRequest.idempotencyKey,
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs,
      manifestHash: startRequest.manifestHash,
      toolCatalogHash: startRequest.toolCatalogHash,
      toolDefinitions,
      provider: startRequest.provider,
      model: startRequest.model,
      ttlSeconds: 900,
    };
    const invocation = {
      schemaVersion: '2.0' as const,
      invocationId: 'runtime_invocation_1',
      runId: bound.runId,
      turnId: 'runtime_turn_0000001',
      toolName: 'workspace.read',
      toolVersion: '1.0.0',
      operation: 'read',
      arguments: { pathHandle: 'opaque_handle_0001' },
      targetId: 'runtime_target_00001',
      epochs,
      idempotencyKey: 'runtime_invoke_key_1',
      requestedAt: '2026-08-02T10:00:00.000Z',
    };
    await expect(
      store.start({
        ownerId: bound.ownerId,
        messageId: bound.messageId,
        request: startRequest,
        ttlSeconds: 59,
      }),
    ).rejects.toThrow('TTL is invalid');
    await expect(
      store.admitInvocation({
        ...bound,
        invocation: { ...invocation, runId: 'runtime_other_000001' },
      }),
    ).rejects.toThrow('invocation run');
    await expect(
      store.admitInvocation({
        ...bound,
        invocation: { ...invocation, epochs: { ...epochs, policy: 5 } },
      }),
    ).rejects.toThrow('authoritative epochs');

    const canonical = stableRuntimeV2Json({
      error: null,
      modelText: null,
      structured: { ok: true },
    });
    const command = {
      generation: bound.generation,
      idempotencyKey: 'runtime_result_key_1',
      epochs,
      result: {
        schemaVersion: '2.0' as const,
        invocationId: invocation.invocationId,
        status: 'succeeded' as const,
        structured: { ok: true },
        receipt: {
          schemaVersion: '2.0' as const,
          receiptId: 'runtime_receipt_0001',
          invocationId: invocation.invocationId,
          argumentHash: runtimeV2Sha256(stableRuntimeV2Json(invocation.arguments)),
          resultHash: runtimeV2Sha256(canonical),
          startedAt: '2026-08-02T10:00:00.000Z',
          completedAt: '2026-08-02T10:00:01.000Z',
          durationMs: 1_000,
          outputBytes: new TextEncoder().encode(canonical).byteLength,
          truncated: false,
          redactionApplied: false,
        },
        continuation: { action: 'final' as const },
      },
    };
    await expect(
      store.submitResult({ ...bound, command: { ...command, generation: 'runtime_other_000001' } }),
    ).rejects.toThrow('result generation');
    await expect(
      store.submitResult({ ...bound, command: { ...command, epochs: { ...epochs, target: 5 } } }),
    ).rejects.toThrow('authoritative epochs');
    await expect(
      store.submitResult({
        ...bound,
        command: {
          ...command,
          result: { ...command.result, receipt: { ...command.result.receipt, outputBytes: 1 } },
        },
      }),
    ).rejects.toThrow('receipt does not match');
    await expect(
      store.submitResult({
        ...bound,
        command: {
          ...command,
          result: { ...command.result, receipt: { ...command.result.receipt, resultHash: hash } },
        },
      }),
    ).rejects.toThrow('receipt does not match');

    const steering = {
      generation: bound.generation,
      steering: {
        schemaVersion: '2.0' as const,
        steeringId: 'runtime_steering_001',
        runId: bound.runId,
        sequence: 0,
        idempotencyKey: 'runtime_steer_key_1',
        message: 'Use safe state.',
        epochs,
        receivedAt: '2026-08-02T10:00:02.000Z',
      },
    };
    await expect(
      store.submitSteering({
        ...bound,
        command: { ...steering, generation: 'runtime_other_000001' },
      }),
    ).rejects.toThrow('steering identity');
    await expect(
      store.submitSteering({
        ...bound,
        command: { ...steering, steering: { ...steering.steering, runId: 'runtime_other_000001' } },
      }),
    ).rejects.toThrow('steering identity');
    await expect(
      store.submitSteering({
        ...bound,
        command: {
          ...steering,
          steering: { ...steering.steering, epochs: { ...epochs, workspace: 5 } },
        },
      }),
    ).rejects.toThrow('authoritative epochs');
    await expect(
      store.cancel({
        ...bound,
        command: {
          generation: 'runtime_other_000001',
          idempotencyKey: 'runtime_cancel_key_1',
          epochs,
          requestedAt: '2026-08-02T10:00:03.000Z',
        },
      }),
    ).rejects.toThrow('cancellation generation');
    expect(redis.commands).toHaveLength(0);
    const failedCanonical = stableRuntimeV2Json({
      error: { code: 'FAILED', message: 'redacted', redactionApplied: true, retryable: false },
      modelText: 'redacted summary',
      structured: null,
    });
    redis.replies.push([
      'OK',
      JSON.stringify({
        runId: bound.runId,
        sequence: 4,
        eventId: 'runtime_event_00004',
      }),
    ]);
    await expect(
      store.submitResult({
        ...bound,
        command: {
          ...command,
          idempotencyKey: 'runtime_result_failed1',
          result: {
            schemaVersion: command.result.schemaVersion,
            invocationId: command.result.invocationId,
            status: 'failed',
            modelText: 'redacted summary',
            error: {
              code: 'FAILED',
              message: 'redacted',
              retryable: false,
              redactionApplied: true,
            },
            receipt: {
              ...command.result.receipt,
              resultHash: runtimeV2Sha256(failedCanonical),
              outputBytes: new TextEncoder().encode(failedCanonical).byteLength,
            },
            continuation: command.result.continuation,
          },
        },
      }),
    ).resolves.toMatchObject({ sequence: 4 });
  });
});
