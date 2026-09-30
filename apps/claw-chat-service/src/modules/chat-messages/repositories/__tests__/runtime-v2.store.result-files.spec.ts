import { HttpStatus } from '@nestjs/common';
import { BusinessException } from '../../../../common/errors';
import { describe, expect, it } from 'vitest';
import type {
  RuntimeResultDto,
  RuntimeStartDto,
  ToolInvocationDto,
} from '../../dto/runtime-v2.dto';
import type { RuntimeV2BoundInput } from '../../types/runtime-v2-store.types';
import { runtimeV2Sha256, stableRuntimeV2Json } from '../../utilities/runtime-v2-identity.utility';
import { RuntimeV2Store } from '../runtime-v2.store';
import { RuntimeV2RedisStateMachine } from './runtime-v2-redis-state-machine.fake';

// F030: a tool result's `fileIds` are covered by the receipt's resultHash and
// outputBytes. A result without them hashes exactly as it did before.

const epochs = { account: 1, workspace: 2, target: 3, policy: 4 };
const hash = `sha256:${'a'.repeat(64)}`;
const toolDefinitions = [
  {
    schemaVersion: '2.0' as const,
    name: 'workspace.browser',
    version: '2.0.0',
    description: 'Observe a page.',
    operations: ['observe'],
    riskClasses: ['browser' as const],
    targetIds: ['runtime_target_00001'],
    inputSchema: { type: 'object', additionalProperties: false },
  },
];

function startRequest(): RuntimeStartDto {
  return {
    schemaVersion: '2.0',
    threadId: 'runtime_thread_00001',
    clientRequestId: 'runtime_request_00001',
    idempotencyKey: 'runtime_idempotency_1',
    prompt: 'Look at the page.',
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

function invocation(runId: string): ToolInvocationDto {
  return {
    schemaVersion: '2.0',
    invocationId: 'runtime_invocation_0001',
    runId,
    turnId: 'runtime_turn_0001000000',
    toolName: 'workspace.browser',
    toolVersion: '2.0.0',
    operation: 'observe',
    arguments: { sessionId: 'session_1' },
    targetId: 'runtime_target_00001',
    epochs,
    idempotencyKey: 'runtime_invoke_key_0001',
    requestedAt: '2026-08-02T10:00:00.000Z',
  };
}

function result(
  generation: string,
  fileIds: string[],
  hashedFileIds: string[] | undefined,
): RuntimeResultDto {
  const canonical = stableRuntimeV2Json({
    error: null,
    modelText: null,
    structured: { observed: true },
    ...(hashedFileIds === undefined ? {} : { fileIds: hashedFileIds }),
  });
  return {
    generation,
    idempotencyKey: 'runtime_result_key_0001',
    epochs,
    result: {
      schemaVersion: '2.0',
      invocationId: 'runtime_invocation_0001',
      status: 'succeeded',
      structured: { observed: true },
      fileIds,
      receipt: {
        schemaVersion: '2.0',
        receiptId: 'receipt_runtime_0001',
        invocationId: 'runtime_invocation_0001',
        argumentHash: runtimeV2Sha256(stableRuntimeV2Json({ sessionId: 'session_1' })),
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

async function admitted(): Promise<{ store: RuntimeV2Store; bound: RuntimeV2BoundInput }> {
  const store = new RuntimeV2Store(new RuntimeV2RedisStateMachine());
  const ack = await store.start({
    ownerId: 'runtime_owner_000001',
    messageId: 'runtime_message_0001',
    request: startRequest(),
    ttlSeconds: 900,
  });
  const bound: RuntimeV2BoundInput = {
    ownerId: 'runtime_owner_000001',
    threadId: 'runtime_thread_00001',
    messageId: 'runtime_message_0001',
    clientRequestId: 'runtime_request_00001',
    startIdempotencyKey: 'runtime_idempotency_1',
    manifestHash: hash,
    toolCatalogHash: startRequest().toolCatalogHash,
    toolDefinitions,
    provider: 'OLLAMA',
    model: 'qwen3:1.7b',
    runId: ack.runId,
    generation: ack.generation,
    epochs,
    ttlSeconds: 900,
  };
  await store.admitInvocation({ ...bound, invocation: invocation(ack.runId) });
  return { store, bound };
}

describe('RuntimeV2Store result fileIds receipt coverage', () => {
  it('accepts a result whose receipt hashes its fileIds', async () => {
    const { store, bound } = await admitted();
    const command = result(bound.generation, ['file-1'], ['file-1']);

    const ack = await store.submitResult({ ...bound, command });

    expect(ack.replayed).toBe(false);
  });

  it('rejects a result whose receipt was computed without its fileIds', async () => {
    const { store, bound } = await admitted();
    const command = result(bound.generation, ['file-1'], undefined);

    await expect(store.submitResult({ ...bound, command })).rejects.toThrow(
      'Runtime V2 result receipt does not match canonical output',
    );
  });

  it('rejects a result whose fileIds were swapped after hashing', async () => {
    const { store, bound } = await admitted();
    const command = result(bound.generation, ['file-2'], ['file-1']);

    await expect(store.submitResult({ ...bound, command })).rejects.toThrow(
      'Runtime V2 result receipt does not match canonical output',
    );
  });

  it('reports a receipt mismatch as a structured 422, not an unhandled 500', async () => {
    const { store, bound } = await admitted();
    const command = result(bound.generation, ['file-1'], undefined);

    const failure: unknown = await store
      .submitResult({ ...bound, command })
      .catch((e: unknown) => e);

    expect(failure).toBeInstanceOf(BusinessException);
    expect((failure as BusinessException).code).toBe('RUNTIME_RESULT_RECEIPT_MISMATCH');
    expect((failure as BusinessException).getStatus()).toBe(HttpStatus.UNPROCESSABLE_ENTITY);
  });
});
