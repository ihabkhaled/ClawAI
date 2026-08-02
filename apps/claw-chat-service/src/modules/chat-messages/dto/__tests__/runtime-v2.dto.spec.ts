import {
  continuationSchema,
  runBudgetSchema,
  runtimeCancelSchema,
  runtimeResultSchema,
  runtimeStartSchema,
  runtimeSteeringSchema,
  runtimeStreamQuerySchema,
  toolDefinitionSchema,
  toolInvocationSchema,
  toolReceiptSchema,
  toolResultSchema,
} from '../runtime-v2.dto';

const epochs = { account: 1, workspace: 2, target: 3, policy: 4 };
const id = 'runtime_identifier_0001';
const hash = `sha256:${'a'.repeat(64)}`;
const budget = {
  maxModelTurns: 4,
  maxToolCalls: 4,
  maxToolRounds: 2,
  maxRepairAttempts: 1,
  maxRuntimeMs: 60_000,
  maxOutputBytes: 65_536,
  maxToolResultBytes: 32_768,
};

describe('Runtime V2 DTO boundary', () => {
  it('accepts the extension golden tool definition and invocation vectors', () => {
    expect(
      toolDefinitionSchema.parse({
        schemaVersion: '2.0',
        name: 'workspace.read',
        version: '1.0.0',
        description: 'Read a bounded workspace fixture.',
        operations: ['read'],
        riskClasses: ['inspect'],
        targetIds: [id],
        inputSchema: { type: 'object', additionalProperties: false },
      }),
    ).toBeDefined();
    expect(
      toolInvocationSchema.parse({
        schemaVersion: '2.0',
        invocationId: id,
        runId: 'runtime_run_00000001',
        turnId: 'runtime_turn_0000001',
        toolName: 'workspace.read',
        toolVersion: '1.0.0',
        operation: 'read',
        arguments: { pathHandle: 'opaque_handle_0001' },
        targetId: 'runtime_target_00001',
        epochs,
        idempotencyKey: 'runtime_idempotency_1',
        requestedAt: '2026-08-02T10:00:00.000Z',
      }),
    ).toBeDefined();
  });

  it('requires a bounded declarative tool catalog while rejecting client-supplied authority', () => {
    const toolDefinitions = [
      {
        schemaVersion: '2.0',
        name: 'workspace.read',
        version: '1.0.0',
        description: 'Read a bounded fixture.',
        operations: ['read'],
        riskClasses: ['inspect'],
        targetIds: [id],
        inputSchema: { type: 'object', additionalProperties: false },
      },
    ];
    const base = {
      schemaVersion: '2.0',
      threadId: id,
      clientRequestId: 'runtime_request_00001',
      idempotencyKey: 'runtime_idempotency_1',
      prompt: 'Inspect the workspace fixture.',
      manifestHash: hash,
      toolCatalogHash: hash,
      toolDefinitions,
      provider: 'OLLAMA',
      model: 'qwen3:1.7b',
      epochs,
      budget,
    };
    expect(runtimeStartSchema.safeParse(base).success).toBe(true);
    expect(runtimeStartSchema.safeParse({ ...base, toolDefinitions: [] }).success).toBe(false);
    for (const injected of [
      { userId: id },
      { role: 'ADMIN' },
      { permissions: ['AGENT_USE'] },
      { providerCredentials: { token: 'secret' } },
      { runId: id },
      { generation: id },
    ]) {
      expect(runtimeStartSchema.safeParse({ ...base, ...injected }).success).toBe(false);
    }
  });

  it('enforces UTF-8 byte and recursive JSON bounds', () => {
    const oversized = 'ðŸ˜€'.repeat(8_193);
    const deep = { a: { a: { a: { a: { a: { a: { a: { a: { a: { a: 1 } } } } } } } } } };
    const start = {
      schemaVersion: '2.0',
      threadId: id,
      clientRequestId: 'runtime_request_00001',
      idempotencyKey: 'runtime_idempotency_1',
      prompt: oversized,
      manifestHash: hash,
      toolCatalogHash: hash,
      provider: 'OLLAMA',
      model: 'qwen3:1.7b',
      epochs,
      budget,
    };
    expect(runtimeStartSchema.safeParse(start).success).toBe(false);
    expect(
      toolInvocationSchema.safeParse({
        schemaVersion: '2.0',
        invocationId: id,
        runId: 'runtime_run_00000001',
        turnId: 'runtime_turn_0000001',
        toolName: 'workspace.read',
        toolVersion: '1.0.0',
        operation: 'read',
        arguments: deep,
        targetId: 'runtime_target_00001',
        epochs,
        idempotencyKey: 'runtime_idempotency_1',
        requestedAt: '2026-08-02T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects prototype keys, null substitutions, non-finite values and unknown fields', () => {
    const prototypePayload = JSON.parse('{"__proto__":{"polluted":true}}');
    expect(toolDefinitionSchema.safeParse({ ...prototypePayload }).success).toBe(false);
    expect(
      runtimeStreamQuerySchema.safeParse({ protocol: 'v2', runId: id, after: Number.NaN }).success,
    ).toBe(false);
    expect(runtimeStreamQuerySchema.safeParse({ protocol: 'v2', runId: null }).success).toBe(false);
    expect(
      runtimeStreamQuerySchema.safeParse({ protocol: 'v2', runId: id, extra: true }).success,
    ).toBe(false);
  });

  it('pins strict result, steering, cancel and stream command envelopes', () => {
    const receipt = {
      schemaVersion: '2.0',
      receiptId: 'runtime_receipt_00001',
      invocationId: id,
      argumentHash: hash,
      resultHash: hash,
      startedAt: '2026-08-02T10:00:00.000Z',
      completedAt: '2026-08-02T10:00:01.000Z',
      durationMs: 1_000,
      outputBytes: 12,
      truncated: false,
      redactionApplied: false,
    };
    expect(
      runtimeResultSchema.safeParse({
        generation: 'runtime_generation_1',
        idempotencyKey: 'runtime_idempotency_2',
        epochs,
        result: {
          schemaVersion: '2.0',
          invocationId: id,
          status: 'succeeded',
          structured: { ok: true },
          receipt,
          continuation: { action: 'final' },
        },
      }).success,
    ).toBe(true);
    expect(
      runtimeSteeringSchema.safeParse({
        generation: 'runtime_generation_1',
        steering: {
          schemaVersion: '2.0',
          steeringId: 'runtime_steering_001',
          runId: 'runtime_run_00000001',
          sequence: 0,
          idempotencyKey: 'runtime_idempotency_3',
          message: 'Use the safer fixture.',
          epochs,
          receivedAt: '2026-08-02T10:00:02.000Z',
        },
      }).success,
    ).toBe(true);
    expect(
      runtimeCancelSchema.safeParse({
        generation: 'runtime_generation_1',
        idempotencyKey: 'runtime_idempotency_4',
        epochs,
        requestedAt: '2026-08-02T10:00:03.000Z',
      }).success,
    ).toBe(true);
    expect(
      runtimeStreamQuerySchema.safeParse({
        protocol: 'v2',
        runId: 'runtime_run_00000001',
        generation: 'runtime_generation_1',
        after: 0,
      }).success,
    ).toBe(true);
  });

  it('rejects duplicate catalog authority and oversized nested object maps', () => {
    const definition = {
      schemaVersion: '2.0',
      name: 'workspace.read',
      version: '1.0.0',
      description: 'Read a bounded fixture.',
      operations: ['read'],
      riskClasses: ['inspect'],
      targetIds: [id],
      inputSchema: { type: 'object' },
    };
    for (const duplicate of [
      { operations: ['read', 'read'] },
      { riskClasses: ['inspect', 'inspect'] },
      { targetIds: [id, id] },
    ]) {
      expect(toolDefinitionSchema.safeParse({ ...definition, ...duplicate }).success).toBe(false);
    }
    const entries = Object.fromEntries(
      Array.from({ length: 1_001 }, (_, index) => [`key${String(index)}`, index]),
    );
    expect(
      toolInvocationSchema.safeParse({
        schemaVersion: '2.0',
        invocationId: id,
        runId: 'runtime_run_00000001',
        turnId: 'runtime_turn_0000001',
        toolName: 'workspace.read',
        toolVersion: '1.0.0',
        operation: 'read',
        arguments: { nested: entries },
        targetId: 'runtime_target_00001',
        epochs,
        idempotencyKey: 'runtime_idempotency_1',
        requestedAt: '2026-08-02T10:00:00.000Z',
      }).success,
    ).toBe(false);
  });

  it('rejects duplicate identities across the admitted tool catalog', () => {
    const definition = {
      schemaVersion: '2.0',
      name: 'workspace.read',
      version: '1.0.0',
      description: 'Read a bounded fixture.',
      operations: ['read'],
      riskClasses: ['inspect'],
      targetIds: [id],
      inputSchema: { type: 'object' },
    };
    expect(
      runtimeStartSchema.safeParse({
        schemaVersion: '2.0',
        threadId: id,
        clientRequestId: 'runtime_request_00001',
        idempotencyKey: 'runtime_idempotency_1',
        prompt: 'Inspect the workspace fixture.',
        manifestHash: hash,
        toolCatalogHash: hash,
        toolDefinitions: [definition, definition],
        provider: 'OLLAMA',
        model: 'qwen3:1.7b',
        epochs,
        budget,
      }).success,
    ).toBe(false);
  });

  it('rejects an admitted catalog above the aggregate byte ceiling', () => {
    const largeSchema = {
      first: 'x'.repeat(65_000),
      second: 'x'.repeat(65_000),
      third: 'x'.repeat(65_000),
      fourth: 'x'.repeat(65_000),
    };
    const toolDefinitions = Array.from({ length: 9 }, (_, index) => ({
      schemaVersion: '2.0',
      name: `workspace.read${String(index)}`,
      version: '1.0.0',
      description: 'Read a bounded fixture.',
      operations: ['read'],
      riskClasses: ['inspect'],
      targetIds: [id],
      inputSchema: largeSchema,
    }));
    expect(
      runtimeStartSchema.safeParse({
        schemaVersion: '2.0',
        threadId: id,
        clientRequestId: 'runtime_request_00001',
        idempotencyKey: 'runtime_idempotency_1',
        prompt: 'Inspect the workspace fixture.',
        manifestHash: hash,
        toolCatalogHash: hash,
        toolDefinitions,
        provider: 'OLLAMA',
        model: 'qwen3:1.7b',
        epochs,
        budget,
      }).success,
    ).toBe(false);
  });

  it('enforces receipt chronology, continuation invariants and result consistency', () => {
    const receipt = {
      schemaVersion: '2.0',
      receiptId: 'runtime_receipt_00001',
      invocationId: id,
      argumentHash: hash,
      resultHash: hash,
      startedAt: '2026-08-02T10:00:00.000Z',
      completedAt: '2026-08-02T10:00:01.000Z',
      durationMs: 1_000,
      outputBytes: 12,
      truncated: false,
      redactionApplied: false,
    };
    expect(
      toolReceiptSchema.safeParse({
        ...receipt,
        completedAt: '2026-08-02T09:59:59.000Z',
      }).success,
    ).toBe(false);
    for (const continuation of [
      { action: 'continue' },
      { action: 'final', nextTurnId: 'runtime_turn_0000002' },
      { action: 'repair' },
      { action: 'final', repairAttempt: 1 },
    ]) {
      expect(continuationSchema.safeParse(continuation).success).toBe(false);
    }
    const result = {
      schemaVersion: '2.0',
      invocationId: id,
      status: 'succeeded',
      structured: { ok: true },
      receipt,
      continuation: { action: 'final' },
    };
    expect(
      toolResultSchema.safeParse({
        ...result,
        error: { code: 'FAILED', message: 'redacted', retryable: false, redactionApplied: true },
      }).success,
    ).toBe(false);
    expect(toolResultSchema.safeParse({ ...result, status: 'failed' }).success).toBe(false);
    expect(
      toolResultSchema.safeParse({
        ...result,
        receipt: { ...receipt, invocationId: 'runtime_other_000001' },
      }).success,
    ).toBe(false);
    expect(
      runBudgetSchema.safeParse({ ...budget, maxToolCalls: 1, maxToolRounds: 2 }).success,
    ).toBe(false);
    expect(
      runtimeStreamQuerySchema.parse({
        protocol: 'v2',
        runId: id,
        generation: 'runtime_generation_1',
      }).after,
    ).toBe(-1);
  });
});
