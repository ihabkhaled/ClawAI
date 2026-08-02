import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import Redis from 'ioredis';

import { AppConfig } from '../../../../app/config/app.config';
import { RedisService } from '../../../../infrastructure/redis/redis.service';
import { RedisClientAdapter } from '../../../../infrastructure/redis/redis-client.adapter';
import type { RuntimeStartDto, ToolInvocationDto } from '../../dto/runtime-v2.dto';
import { runtimeV2Sha256, stableRuntimeV2Json } from '../../utilities/runtime-v2-identity.utility';
import {
  runtimeV2ClientRequestKey,
  runtimeV2KeyFamily,
  runtimeV2MessageKey,
  runtimeV2StartKey,
} from '../../utilities/runtime-v2-key.utility';
import { RuntimeV2Store } from '../runtime-v2.store';

const epochs = { account: 1, workspace: 2, target: 3, policy: 4 };
const ownerId = 'runtime_e2e_owner_0001';
const messageId = 'runtime_e2e_message_01';
const threadId = 'runtime_e2e_thread_001';
const hash = `sha256:${'b'.repeat(64)}`;
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
const runtimeV2RedisKeyPattern = 'chat:runtime:v2:{runtime-v2}:*';
const request: RuntimeStartDto = {
  schemaVersion: '2.0',
  threadId,
  clientRequestId: 'runtime_e2e_request_01',
  idempotencyKey: 'runtime_e2e_start_key1',
  prompt: 'No secrets in persisted state.',
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

describe('Runtime V2 Redis Lua authority', () => {
  const client = new Redis(AppConfig.runtimeV2RedisTestUrl(), { maxRetriesPerRequest: 1 });
  const store = new RuntimeV2Store(new RedisService(new RedisClientAdapter(client)));
  const cleanupKeys = new Set<string>();

  async function clearRuntimeV2Namespace(): Promise<void> {
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(
        cursor,
        'MATCH',
        runtimeV2RedisKeyPattern,
        'COUNT',
        1_000,
      );
      cursor = nextCursor;
      if (keys.length > 0) await client.del(...keys);
    } while (cursor !== '0');
  }

  beforeAll(async () => {
    await client.ping();
    await clearRuntimeV2Namespace();
  });

  afterAll(async () => {
    if (cleanupKeys.size > 0) await client.del(...cleanupKeys);
    await client.quit();
  });

  it('executes start, replay, mutation, cursor and aligned TTL semantics on Redis 7', async () => {
    const input = { ownerId, messageId, request, ttlSeconds: 60 };
    const start = await store.start(input);
    const family = runtimeV2KeyFamily(start.runId);
    const allKeys = [
      family.state,
      family.events,
      family.acknowledgements,
      family.invocations,
      family.results,
      family.steering,
      family.steeringData,
      runtimeV2MessageKey(messageId),
      runtimeV2StartKey(ownerId, request.idempotencyKey),
      runtimeV2ClientRequestKey(ownerId, request.clientRequestId),
    ];
    for (const key of allKeys) cleanupKeys.add(key);
    expect(start.sequence).toBe(0);
    expect(await client.zscore(family.events, 'missing')).toBeNull();
    const initialEvents = await client.zrange(family.events, 0, -1);
    expect(JSON.parse(initialEvents[0] ?? '{}')).toMatchObject({
      sequence: 0,
      schemaVersion: '2.0',
      runId: start.runId,
    });
    const initialReplay = await store.readEvents({
      ownerId,
      threadId,
      messageId,
      startIdempotencyKey: request.idempotencyKey,
      clientRequestId: request.clientRequestId,
      runId: start.runId,
      generation: start.generation,
      epochs,
      manifestHash: request.manifestHash,
      toolCatalogHash: request.toolCatalogHash,
      toolDefinitions,
      provider: request.provider,
      model: request.model,
      ttlSeconds: 60,
      after: -1,
    });
    expect(initialReplay.events.map((event) => event.sequence)).toEqual([0]);
    expect(initialReplay.events[0]).toMatchObject({
      type: 'run.created',
      visibility: 'user',
      sensitivity: 'sensitive-redacted',
      payload: {},
    });
    const beforeReplay = await Promise.all(allKeys.map((key) => client.pttl(key)));
    expect(await Promise.all(allKeys.map((key) => client.exists(key)))).toEqual([
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    ]);
    const replay = await store.start(input);
    expect(replay).toEqual({ ...start, replayed: true });
    const afterReplay = await Promise.all(allKeys.map((key) => client.pttl(key)));
    expect(afterReplay.every((ttl, index) => ttl <= (beforeReplay.at(index) ?? 0))).toBe(true);

    const bound = {
      ownerId,
      threadId,
      messageId,
      startIdempotencyKey: request.idempotencyKey,
      clientRequestId: request.clientRequestId,
      runId: start.runId,
      generation: start.generation,
      epochs,
      manifestHash: request.manifestHash,
      toolCatalogHash: request.toolCatalogHash,
      toolDefinitions,
      provider: request.provider,
      model: request.model,
      ttlSeconds: 60,
    };
    const invocation: ToolInvocationDto = {
      schemaVersion: '2.0',
      invocationId: 'runtime_e2e_invocation1',
      runId: start.runId,
      turnId: 'runtime_e2e_turn_0001',
      toolName: 'workspace.read',
      toolVersion: '1.0.0',
      operation: 'read',
      arguments: { pathHandle: 'opaque_e2e_handle_1' },
      targetId: 'runtime_e2e_target_001',
      epochs,
      idempotencyKey: 'runtime_e2e_invoke_key1',
      requestedAt: '2026-08-02T10:00:00.000Z',
    };
    const resultCanonical = stableRuntimeV2Json({
      error: null,
      modelText: null,
      structured: { ok: true },
    });
    const admitted = await store.admitInvocation({ ...bound, invocation });
    expect(admitted.sequence).toBe(2);
    const afterMutation = await Promise.all(allKeys.map((key) => client.pttl(key)));
    expect(Math.max(...afterMutation) - Math.min(...afterMutation)).toBeLessThan(100);
    const resultCommand = {
      generation: start.generation,
      idempotencyKey: 'runtime_e2e_result_key1',
      epochs,
      result: {
        schemaVersion: '2.0' as const,
        invocationId: invocation.invocationId,
        status: 'succeeded' as const,
        structured: { ok: true },
        receipt: {
          schemaVersion: '2.0' as const,
          receiptId: 'runtime_e2e_receipt_01',
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
        continuation: { action: 'final' as const },
      },
    };
    const resultAck = await store.submitResult({ ...bound, command: resultCommand });
    expect(resultAck.sequence).toBe(3);
    const resultTtls = await Promise.all(allKeys.map((key) => client.pttl(key)));
    const resultReplay = await store.submitResult({ ...bound, command: resultCommand });
    expect(resultReplay).toEqual({ ...resultAck, replayed: true });
    const replayTtls = await Promise.all(allKeys.map((key) => client.pttl(key)));
    expect(replayTtls.every((ttl, index) => ttl <= (resultTtls.at(index) ?? 0))).toBe(true);

    const steering = {
      generation: start.generation,
      steering: {
        schemaVersion: '2.0' as const,
        steeringId: 'runtime_e2e_steering01',
        runId: start.runId,
        sequence: 0,
        idempotencyKey: 'runtime_e2e_steer_key1',
        message: 'Use only the safe fixture.',
        epochs,
        receivedAt: '2026-08-02T10:00:02.000Z',
      },
    };
    expect((await store.submitSteering({ ...bound, command: steering })).sequence).toBe(4);
    await expect(
      store.submitSteering({
        ...bound,
        command: {
          ...steering,
          steering: {
            ...steering.steering,
            sequence: 2,
            steeringId: 'runtime_e2e_steering02',
            idempotencyKey: 'runtime_e2e_steer_key2',
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });

    const claimInput = {
      ...bound,
      provider: request.provider,
      model: request.model,
      deliveryId: 'runtime_e2e_delivery01',
    };
    const claim = await store.claimRouted(claimInput);
    expect(claim).toMatchObject({ sequence: 5, claimed: true });
    expect(await store.claimRouted(claimInput)).toMatchObject({
      sequence: 5,
      replayed: true,
      claimed: false,
    });
    const dispatchInput = {
      ...bound,
      claimId: claim.claimId,
      idempotencyKey: 'runtime_e2e_dispatch1',
      dispatchedAt: '2026-08-02T10:00:03.000Z',
    };
    const dispatch = await store.markProviderDispatched(dispatchInput);
    expect(dispatch.sequence).toBe(6);
    expect(await store.markProviderDispatched(dispatchInput)).toEqual({
      ...dispatch,
      replayed: true,
    });
    await expect(
      store.markProviderDispatched({ ...dispatchInput, idempotencyKey: 'runtime_e2e_dispatch2' }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });
    const terminalInput = {
      ...bound,
      claimId: claim.claimId,
      idempotencyKey: 'runtime_e2e_terminal1',
      status: 'completed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
    };
    const terminal = await store.terminalize(terminalInput);
    expect(terminal.sequence).toBe(7);
    expect(await store.terminalize(terminalInput)).toEqual({ ...terminal, replayed: true });

    const beforeTerminalReplays = await Promise.all(allKeys.map((key) => client.pttl(key)));
    expect(await store.admitInvocation({ ...bound, invocation })).toEqual({
      ...admitted,
      replayed: true,
    });
    expect(await store.submitResult({ ...bound, command: resultCommand })).toEqual({
      ...resultAck,
      replayed: true,
    });
    expect(await store.submitSteering({ ...bound, command: steering })).toMatchObject({
      sequence: 4,
      replayed: true,
    });
    const afterTerminalReplays = await Promise.all(allKeys.map((key) => client.pttl(key)));
    expect(
      afterTerminalReplays.every((ttl, index) => ttl <= (beforeTerminalReplays.at(index) ?? 0)),
    ).toBe(true);
    await expect(
      store.admitInvocation({
        ...bound,
        invocation: {
          ...invocation,
          invocationId: 'runtime_e2e_invocation_terminal_new',
          idempotencyKey: 'runtime_e2e_invoke_terminal_new',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });

    const events = await store.readEvents({ ...bound, after: 0 });
    expect(events.events.map((event) => event.sequence)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(events.events[0]).toMatchObject({
      schemaVersion: '2.0',
      runId: start.runId,
      sequence: 1,
      type: 'tool.requested',
    });
    expect(events.events[1]).toMatchObject({
      schemaVersion: '2.0',
      runId: start.runId,
      sequence: 2,
      type: 'tool.started',
    });
    expect(events.terminal).toBe(true);
    expect(await client.hget(family.state, 'prompt')).toBeNull();
  });

  it('atomically enforces owner-scoped client request uniqueness across concurrent starts', async () => {
    const firstInput = {
      ownerId,
      messageId: 'runtime_e2e_message_client_1',
      request: {
        ...request,
        clientRequestId: 'runtime_e2e_client_unique_1',
        idempotencyKey: 'runtime_e2e_client_start_1',
        prompt: 'First client request body.',
      },
      ttlSeconds: 60,
    };
    const secondInput = {
      ownerId,
      messageId: 'runtime_e2e_message_client_2',
      request: {
        ...firstInput.request,
        idempotencyKey: 'runtime_e2e_client_start_2',
        prompt: 'Changed client request body.',
      },
      ttlSeconds: 60,
    };
    const results = await Promise.allSettled([store.start(firstInput), store.start(secondInput)]);
    expect(results.map((result) => result.status).sort()).toEqual(['fulfilled', 'rejected']);

    const firstAccepted = results[0]?.status === 'fulfilled';
    const acceptedResult = firstAccepted ? results[0] : results[1];
    const acceptedInput = firstAccepted ? firstInput : secondInput;
    const rejectedInput = firstAccepted ? secondInput : firstInput;
    if (acceptedResult === undefined || acceptedResult.status !== 'fulfilled')
      throw new Error('Expected one atomic Runtime V2 start winner');

    const family = runtimeV2KeyFamily(acceptedResult.value.runId);
    for (const key of Object.values(family)) cleanupKeys.add(key);
    cleanupKeys.add(runtimeV2MessageKey(acceptedInput.messageId));
    cleanupKeys.add(runtimeV2StartKey(ownerId, acceptedInput.request.idempotencyKey));
    cleanupKeys.add(runtimeV2StartKey(ownerId, rejectedInput.request.idempotencyKey));
    cleanupKeys.add(runtimeV2ClientRequestKey(ownerId, acceptedInput.request.clientRequestId));

    expect(await store.start(acceptedInput)).toEqual({
      ...acceptedResult.value,
      replayed: true,
    });
    await expect(store.start(rejectedInput)).rejects.toMatchObject({
      code: 'RUNTIME_REPLAY_CONFLICT',
    });
    expect(
      await client.exists(
        runtimeV2ClientRequestKey(ownerId, acceptedInput.request.clientRequestId),
      ),
    ).toBe(1);
  });

  it('keeps a cancellation tombstone and never recreates expired state', async () => {
    const cancelRequest = {
      ...request,
      clientRequestId: 'runtime_e2e_request_02',
      idempotencyKey: 'runtime_e2e_start_key2',
      prompt: 'Cancellation fixture.',
    };
    const start = await store.start({
      ownerId,
      messageId: 'runtime_e2e_message_02',
      request: cancelRequest,
      ttlSeconds: 60,
    });
    const family = runtimeV2KeyFamily(start.runId);
    const keys = [
      family.state,
      family.events,
      family.acknowledgements,
      family.invocations,
      family.results,
      family.steering,
      family.steeringData,
      runtimeV2MessageKey('runtime_e2e_message_02'),
      runtimeV2StartKey(ownerId, cancelRequest.idempotencyKey),
      runtimeV2ClientRequestKey(ownerId, cancelRequest.clientRequestId),
    ];
    for (const key of keys) cleanupKeys.add(key);
    const bound = {
      ownerId,
      threadId,
      messageId: 'runtime_e2e_message_02',
      startIdempotencyKey: cancelRequest.idempotencyKey,
      clientRequestId: cancelRequest.clientRequestId,
      runId: start.runId,
      generation: start.generation,
      epochs,
      manifestHash: cancelRequest.manifestHash,
      toolCatalogHash: cancelRequest.toolCatalogHash,
      toolDefinitions,
      provider: cancelRequest.provider,
      model: cancelRequest.model,
      ttlSeconds: 60,
    };
    const command = {
      generation: start.generation,
      idempotencyKey: 'runtime_e2e_cancel_key1',
      epochs,
      requestedAt: '2026-08-02T10:00:05.000Z',
    };
    const cancelled = await store.cancel({ ...bound, command });
    expect(cancelled.sequence).toBe(1);
    expect(await store.cancel({ ...bound, command })).toEqual({ ...cancelled, replayed: true });
    expect(await client.hget(family.state, 'lifecycle')).toBe('cancelled');
    const clientRequestKey = runtimeV2ClientRequestKey(ownerId, cancelRequest.clientRequestId);
    await client.del(clientRequestKey);
    await expect(
      store.cancel({
        ...bound,
        command: { ...command, idempotencyKey: 'runtime_e2e_cancel_client_index_missing' },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
    await expect(
      store.start({
        ownerId,
        messageId: 'runtime_e2e_message_02',
        request: cancelRequest,
        ttlSeconds: 60,
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
    expect(await client.exists(clientRequestKey)).toBe(0);
    await client.del(family.state);
    await expect(
      store.cancel({
        ...bound,
        command: { ...command, idempotencyKey: 'runtime_e2e_cancel_key2' },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
    expect(await client.exists(family.state)).toBe(0);
  });

  it('fails closed on forged immutable bindings, replay conflicts and partial family loss', async () => {
    const guardedRequest = {
      ...request,
      clientRequestId: 'runtime_e2e_request_03',
      idempotencyKey: 'runtime_e2e_start_key3',
      prompt: 'PROMPT_SENTINEL_MUST_NOT_PERSIST_03',
    };
    const guardedMessageId = 'runtime_e2e_message_03';
    const start = await store.start({
      ownerId,
      messageId: guardedMessageId,
      request: guardedRequest,
      ttlSeconds: 60,
    });
    const family = runtimeV2KeyFamily(start.runId);
    const keys = [
      family.state,
      family.events,
      family.acknowledgements,
      family.invocations,
      family.results,
      family.steering,
      family.steeringData,
      runtimeV2MessageKey(guardedMessageId),
      runtimeV2StartKey(ownerId, guardedRequest.idempotencyKey),
      runtimeV2ClientRequestKey(ownerId, guardedRequest.clientRequestId),
    ];
    for (const key of keys) cleanupKeys.add(key);
    const bound = {
      ownerId,
      threadId,
      messageId: guardedMessageId,
      startIdempotencyKey: guardedRequest.idempotencyKey,
      clientRequestId: guardedRequest.clientRequestId,
      runId: start.runId,
      generation: start.generation,
      epochs,
      manifestHash: guardedRequest.manifestHash,
      toolCatalogHash: guardedRequest.toolCatalogHash,
      toolDefinitions,
      provider: guardedRequest.provider,
      model: guardedRequest.model,
      ttlSeconds: 60,
    };

    await expect(
      store.claimRouted({
        ...bound,
        provider: 'FORGED',
        deliveryId: 'runtime_e2e_delivery03',
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });
    await expect(
      store.readEvents({ ...bound, epochs: { ...epochs, policy: 99 }, after: -1 }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });
    await expect(
      store.start({
        ownerId,
        messageId: guardedMessageId,
        request: { ...guardedRequest, prompt: 'changed replay body' },
        ttlSeconds: 60,
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_REPLAY_CONFLICT' });

    const persisted = [
      JSON.stringify(await client.hgetall(family.state)),
      JSON.stringify(await client.hgetall(family.acknowledgements)),
      JSON.stringify(await client.hgetall(family.invocations)),
      JSON.stringify(await client.hgetall(family.results)),
      JSON.stringify(await client.hgetall(family.steeringData)),
      JSON.stringify(await client.zrange(family.events, 0, -1)),
      (await client.get(runtimeV2MessageKey(guardedMessageId))) ?? '',
      (await client.get(runtimeV2StartKey(ownerId, guardedRequest.idempotencyKey))) ?? '',
      (await client.get(runtimeV2ClientRequestKey(ownerId, guardedRequest.clientRequestId))) ?? '',
    ].join('|');
    expect(persisted).not.toContain(guardedRequest.prompt);

    await client.del(family.events);
    await expect(
      store.cancel({
        ...bound,
        command: {
          generation: start.generation,
          idempotencyKey: 'runtime_e2e_cancel_key3',
          epochs,
          requestedAt: '2026-08-02T10:00:06.000Z',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
    expect(await client.exists(family.events)).toBe(0);
    await expect(
      store.start({
        ownerId,
        messageId: guardedMessageId,
        request: guardedRequest,
        ttlSeconds: 60,
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_RUN_NOT_FOUND' });
  });

  it('debits server-computed tool budgets once and rejects unknown or mismatched receipts', async () => {
    const budgetRequest = {
      ...request,
      clientRequestId: 'runtime_e2e_request_04',
      idempotencyKey: 'runtime_e2e_start_key4',
      prompt: 'Budget fixture.',
      budget: { ...request.budget, maxToolCalls: 1, maxToolRounds: 1, maxToolResultBytes: 1_024 },
    };
    const budgetMessageId = 'runtime_e2e_message_04';
    const start = await store.start({
      ownerId,
      messageId: budgetMessageId,
      request: budgetRequest,
      ttlSeconds: 60,
    });
    const family = runtimeV2KeyFamily(start.runId);
    const keys = [
      family.state,
      family.events,
      family.acknowledgements,
      family.invocations,
      family.results,
      family.steering,
      family.steeringData,
      runtimeV2MessageKey(budgetMessageId),
      runtimeV2StartKey(ownerId, budgetRequest.idempotencyKey),
      runtimeV2ClientRequestKey(ownerId, budgetRequest.clientRequestId),
    ];
    for (const key of keys) cleanupKeys.add(key);
    const bound = {
      ownerId,
      threadId,
      messageId: budgetMessageId,
      startIdempotencyKey: budgetRequest.idempotencyKey,
      clientRequestId: budgetRequest.clientRequestId,
      runId: start.runId,
      generation: start.generation,
      epochs,
      manifestHash: budgetRequest.manifestHash,
      toolCatalogHash: budgetRequest.toolCatalogHash,
      toolDefinitions,
      provider: budgetRequest.provider,
      model: budgetRequest.model,
      ttlSeconds: 60,
    };
    const firstInvocation: ToolInvocationDto = {
      schemaVersion: '2.0',
      invocationId: 'runtime_e2e_invocation4',
      runId: start.runId,
      turnId: 'runtime_e2e_turn_0004',
      toolName: 'workspace.read',
      toolVersion: '1.0.0',
      operation: 'read',
      arguments: { pathHandle: 'ARGUMENT_SENTINEL_NOT_STORED_04' },
      targetId: 'runtime_e2e_target_004',
      epochs,
      idempotencyKey: 'runtime_e2e_invoke_key4',
      requestedAt: '2026-08-02T10:00:00.000Z',
    };
    const admitted = await store.admitInvocation({ ...bound, invocation: firstInvocation });
    expect(await store.admitInvocation({ ...bound, invocation: firstInvocation })).toEqual({
      ...admitted,
      replayed: true,
    });
    await expect(
      store.admitInvocation({
        ...bound,
        invocation: {
          ...firstInvocation,
          invocationId: 'runtime_e2e_invocation5',
          idempotencyKey: 'runtime_e2e_invoke_key5',
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });

    const modelText = 'RESULT_SENTINEL_NOT_STORED_04'.repeat(45);
    const canonical = stableRuntimeV2Json({ error: null, modelText, structured: null });
    const command = {
      generation: start.generation,
      idempotencyKey: 'runtime_e2e_result_key4',
      epochs,
      result: {
        schemaVersion: '2.0' as const,
        invocationId: firstInvocation.invocationId,
        status: 'succeeded' as const,
        modelText,
        receipt: {
          schemaVersion: '2.0' as const,
          receiptId: 'runtime_e2e_receipt_04',
          invocationId: firstInvocation.invocationId,
          argumentHash: runtimeV2Sha256(stableRuntimeV2Json(firstInvocation.arguments)),
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
    await expect(store.submitResult({ ...bound, command })).rejects.toMatchObject({
      code: 'RUNTIME_TRANSITION_DENIED',
    });
    await expect(
      store.submitResult({
        ...bound,
        command: {
          ...command,
          idempotencyKey: 'runtime_e2e_result_key5',
          result: {
            ...command.result,
            receipt: { ...command.result.receipt, argumentHash: hash },
          },
        },
      }),
    ).rejects.toMatchObject({ code: 'RUNTIME_TRANSITION_DENIED' });
    const persisted = [
      JSON.stringify(await client.hgetall(family.invocations)),
      JSON.stringify(await client.hgetall(family.results)),
      JSON.stringify(await client.zrange(family.events, 0, -1)),
    ].join('|');
    expect(persisted).not.toContain(firstInvocation.arguments.pathHandle);
    expect(persisted).not.toContain(modelText);
    expect(await client.hget(family.state, 'toolCalls')).toBe('1');
    expect(await client.hget(family.state, 'toolResultBytes')).toBe('0');
  });

  it('bounds event and steering journals and reports an explicit replay gap', async () => {
    const boundedRequest = {
      ...request,
      clientRequestId: 'runtime_e2e_request_05',
      idempotencyKey: 'runtime_e2e_start_key5',
      prompt: 'Bounded journal fixture.',
    };
    const boundedMessageId = 'runtime_e2e_message_05';
    const start = await store.start({
      ownerId,
      messageId: boundedMessageId,
      request: boundedRequest,
      ttlSeconds: 60,
    });
    const family = runtimeV2KeyFamily(start.runId);
    const keys = [
      family.state,
      family.events,
      family.acknowledgements,
      family.invocations,
      family.results,
      family.steering,
      family.steeringData,
      runtimeV2MessageKey(boundedMessageId),
      runtimeV2StartKey(ownerId, boundedRequest.idempotencyKey),
      runtimeV2ClientRequestKey(ownerId, boundedRequest.clientRequestId),
    ];
    for (const key of keys) cleanupKeys.add(key);
    const bound = {
      ownerId,
      threadId,
      messageId: boundedMessageId,
      startIdempotencyKey: boundedRequest.idempotencyKey,
      clientRequestId: boundedRequest.clientRequestId,
      runId: start.runId,
      generation: start.generation,
      epochs,
      manifestHash: boundedRequest.manifestHash,
      toolCatalogHash: boundedRequest.toolCatalogHash,
      toolDefinitions,
      provider: boundedRequest.provider,
      model: boundedRequest.model,
      ttlSeconds: 60,
    };

    for (let sequence = 0; sequence <= 1_000; sequence += 1) {
      await store.submitSteering({
        ...bound,
        command: {
          generation: start.generation,
          steering: {
            schemaVersion: '2.0',
            steeringId: `runtime_steering_bound_${String(sequence)}`,
            runId: start.runId,
            sequence,
            idempotencyKey: `runtime_steer_bound_${String(sequence)}`,
            message: `Bounded steering ${String(sequence)}`,
            epochs,
            receivedAt: '2026-08-02T10:00:07.000Z',
          },
        },
      });
    }

    expect(await client.zcard(family.events)).toBe(1_000);
    expect(await client.zcard(family.steering)).toBe(1_000);
    expect(await client.hlen(family.steeringData)).toBe(1_000);
    await expect(store.readEvents({ ...bound, after: -1 })).rejects.toMatchObject({
      code: 'RUNTIME_REPLAY_CONFLICT',
    });
    const retained = await store.readEvents({ ...bound, after: 1 });
    expect(retained.events).toHaveLength(1_000);
    expect(retained.events[0]?.sequence).toBe(2);
    expect(retained.events.at(-1)?.sequence).toBe(1_001);
  });
});
