import { describe, expect, it } from '@jest/globals';

import {
  buildRuntimeV2ModelInstruction,
  isCapabilityDenial,
  parseRuntimeV2ModelOutput,
} from '../runtime-v2-model-output.utility';
import {
  createRuntimeV2Identity,
  runtimeV2Sha256,
  runtimeV2TerminalFingerprint,
  stableRuntimeV2Json,
} from '../runtime-v2-identity.utility';
import {
  runtimeV2ClientRequestKey,
  runtimeV2KeyFamily,
  runtimeV2MessageKey,
  runtimeV2StartKey,
} from '../runtime-v2-key.utility';
import { parseRuntimeV2TaggedReply, runtimeV2Unavailable } from '../runtime-v2-reply.utility';

describe('Runtime V2 utilities', () => {
  it('grounds tool selection in the admitted catalog and rejects invented tools', () => {
    const definitions = [
      {
        schemaVersion: '2.0' as const,
        name: 'workspace.read',
        version: '1.0.0',
        description: 'Read a bounded workspace file.',
        operations: ['read'],
        riskClasses: ['inspect' as const],
        targetIds: ['runtime_target_00001'],
        inputSchema: {
          type: 'object',
          required: ['pathHandle'],
          properties: { pathHandle: { type: 'string' } },
          additionalProperties: false,
        },
      },
    ];
    const instruction = buildRuntimeV2ModelInstruction(definitions);
    expect(instruction).toContain('workspace.read');
    expect(instruction).toContain('pathHandle');
    expect(instruction).toContain('runtime_target_00001');
    expect(() =>
      parseRuntimeV2ModelOutput(
        JSON.stringify({
          kind: 'tool',
          toolName: 'workspace.delete',
          toolVersion: '1.0.0',
          operation: 'delete',
          arguments: {},
          targetId: 'runtime_target_00001',
        }),
        definitions,
      ),
    ).toThrow('admitted tool catalog');
  });

  it.each([
    'I cannot access your filesystem.',
    'I am unable to read files outside the workspace.',
    "I don't have access to your workspace files.",
    'As a text-based assistant I cannot run commands.',
    'I do not have the ability to execute commands on your machine.',
  ])('detects the agent-self capability denial %p', (content) => {
    expect(isCapabilityDenial(content)).toBe(true);
  });

  it.each([
    'I read src/index.ts and found the entry point.',
    'The focused test failed because the greeting is still Alpha.',
    'I will not help exfiltrate credentials from this repository.',
    'The file does not exist at that path.',
    '',
  ])('does not treat %p as a capability denial', (content) => {
    expect(isCapabilityDenial(content)).toBe(false);
  });

  it('creates independent 128-bit identities and canonical hashes', () => {
    const first = createRuntimeV2Identity('run');
    const second = createRuntimeV2Identity('run');
    expect(first).toMatch(/^run_[a-f0-9]{32}$/u);
    expect(second).not.toBe(first);
    expect(runtimeV2Sha256('safe')).toMatch(/^sha256:[a-f0-9]{64}$/u);
  });

  it('keeps completed terminal fingerprints byte-compatible with SHA-256', async () => {
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OLLAMA',
      model: 'qwen3:1.7b',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'completed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
    };

    await expect(runtimeV2TerminalFingerprint(terminal)).resolves.toBe(
      runtimeV2Sha256(stableRuntimeV2Json(terminal)),
    );
  });

  it('protects a failed terminal reason with a deterministic salted slow digest', async () => {
    const reason = {
      code: 'MISSING_PROVIDER_API_KEY',
      message: 'No API key configured for provider OPENAI',
    };
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OPENAI',
      model: 'gpt-4.1',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'failed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
      reason,
    };

    const first = await runtimeV2TerminalFingerprint(terminal);
    const second = await runtimeV2TerminalFingerprint(terminal);
    const otherRun = await runtimeV2TerminalFingerprint({
      ...terminal,
      runId: 'runtime_run_existing2',
    });

    expect(first).toMatch(/^sha256:[a-f0-9]{64}\.scrypt:[a-f0-9]{64}$/u);
    expect(second).toBe(first);
    expect(otherRun.split('.scrypt:')[1]).not.toBe(first.split('.scrypt:')[1]);
    expect(first).not.toContain(reason.code);
    expect(first).not.toContain(reason.message);
  });

  it('protects a failed terminal without optional reason metadata', async () => {
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OPENAI',
      model: 'gpt-4.1',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'failed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
    };

    await expect(runtimeV2TerminalFingerprint(terminal)).resolves.toMatch(
      /^sha256:[a-f0-9]{64}\.scrypt:[a-f0-9]{64}$/u,
    );
  });

  it('rejects an oversized failed terminal reason code', async () => {
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OPENAI',
      model: 'gpt-4.1',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'failed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
      reason: { code: 'X'.repeat(81), message: 'Provider failed' },
    };

    await expect(runtimeV2TerminalFingerprint(terminal)).rejects.toThrow(
      'Runtime V2 terminal reason exceeds the fingerprint budget',
    );
  });

  it('rejects a failed terminal reason outside the slow-digest input budget', async () => {
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OPENAI',
      model: 'gpt-4.1',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'failed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
      reason: { code: 'FAILED', message: 'x'.repeat(401) },
    };

    await expect(runtimeV2TerminalFingerprint(terminal)).rejects.toThrow(
      'Runtime V2 terminal reason exceeds the fingerprint budget',
    );
  });

  it('rejects an escaped failed reason outside the byte budget', async () => {
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'runtime_run_existing1',
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OPENAI',
      model: 'gpt-4.1',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'failed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
      reason: { code: 'FAILED', message: '\0'.repeat(400) },
    };

    await expect(runtimeV2TerminalFingerprint(terminal)).rejects.toThrow(
      'Runtime V2 terminal reason exceeds the fingerprint budget',
    );
  });

  it('rejects a failed terminal run identity outside the salt input budget', async () => {
    const terminal = {
      ownerId: 'runtime_owner_000001',
      threadId: 'runtime_thread_00001',
      messageId: 'runtime_message_0001',
      clientRequestId: 'runtime_request_00001',
      startIdempotencyKey: 'runtime_idempotency_1',
      runId: 'r'.repeat(129),
      generation: 'runtime_generation_1',
      epochs: { account: 1, workspace: 2, target: 3, policy: 4 },
      manifestHash: `sha256:${'a'.repeat(64)}`,
      toolCatalogHash: `sha256:${'b'.repeat(64)}`,
      toolDefinitions: [],
      provider: 'OPENAI',
      model: 'gpt-4.1',
      claimId: 'runtime_claim_00001',
      ttlSeconds: 900,
      idempotencyKey: 'runtime_terminal_key1',
      status: 'failed' as const,
      completedAt: '2026-08-02T10:00:04.000Z',
      reason: { code: 'FAILED', message: 'Provider failed' },
    };

    await expect(runtimeV2TerminalFingerprint(terminal)).rejects.toThrow(
      'Runtime V2 terminal reason exceeds the fingerprint budget',
    );
  });

  it('canonicalizes every JSON value shape and rejects non-JSON values', () => {
    expect(stableRuntimeV2Json(null)).toBe('null');
    expect(stableRuntimeV2Json(true)).toBe('true');
    expect(stableRuntimeV2Json(4)).toBe('4');
    expect(stableRuntimeV2Json('text')).toBe('"text"');
    expect(stableRuntimeV2Json([2, { z: 1, a: 'é' }])).toBe('[2,{"a":"é","z":1}]');
    expect(stableRuntimeV2Json({ z: 1, a: 2 })).toBe('{"a":2,"z":1}');
    expect(() => stableRuntimeV2Json(Symbol('unsupported'))).toThrow('not JSON compatible');
  });

  it('creates one cluster-safe opaque key family', () => {
    const family = runtimeV2KeyFamily('run_runtime_0001');
    expect(Object.values(family).every((key) => key.includes('{runtime-v2}'))).toBe(true);
    expect(runtimeV2MessageKey('message secret')).not.toContain('message secret');
    expect(runtimeV2StartKey('owner secret', 'idempotency secret')).not.toContain('secret');
    expect(runtimeV2ClientRequestKey('owner secret', 'client request secret')).not.toContain(
      'secret',
    );
    expect(runtimeV2ClientRequestKey('owner one', 'same request')).not.toBe(
      runtimeV2ClientRequestKey('owner two', 'same request'),
    );
  });

  it.each(['OK', 'REPLAY', 'CLAIMED', 'REDIRECT'])('accepts the %s Redis tag', (tag) => {
    expect(parseRuntimeV2TaggedReply([tag, '{}'])).toEqual({ tag, body: '{}' });
  });

  it('maps malformed, missing, conflict and denied replies to stable safe errors', () => {
    expect(() => parseRuntimeV2TaggedReply('raw secret')).toThrow(
      expect.objectContaining({ code: 'RUNTIME_STATE_UNAVAILABLE' }),
    );
    expect(() => parseRuntimeV2TaggedReply(['MISSING', 'raw secret'])).toThrow(
      expect.objectContaining({ code: 'RUNTIME_RUN_NOT_FOUND' }),
    );
    expect(() => parseRuntimeV2TaggedReply(['CONFLICT', 'raw secret'])).toThrow(
      expect.objectContaining({ code: 'RUNTIME_REPLAY_CONFLICT' }),
    );
    expect(() => parseRuntimeV2TaggedReply(['DENIED', 'raw secret'])).toThrow(
      expect.objectContaining({ code: 'RUNTIME_TRANSITION_DENIED' }),
    );
    expect(runtimeV2Unavailable()).toMatchObject({
      code: 'RUNTIME_STATE_UNAVAILABLE',
      message: 'Runtime state is unavailable',
    });
  });
});

describe('parseRuntimeV2ModelOutput — a code answer is an answer, not a tool request', () => {
  // Caught in a live 20-round lab: asking for a bash one-liner failed the whole
  // run with `Unexpected token 'b', "bash`. Any reply opening with a fence was
  // treated as a possible tool request, and the extractor only understood
  // ```json, so raw markdown reached JSON.parse. For a CODING agent this is the
  // common case, not an edge case.
  it.each([
    ['bash', '```bash\nfind . -name "*.ts" | xargs wc -l\n```'],
    ['ts', '```ts\nexport const add = (a: number, b: number): number => a + b;\n```'],
    ['python', '```python\nprint("hello")\n```'],
    ['sql', '```sql\nSELECT * FROM users;\n```'],
    ['no language', '```\nplain fenced text\n```'],
  ])('treats a fenced %s block as final content', (_language, content) => {
    const output = parseRuntimeV2ModelOutput(content);

    expect(output.kind).toBe('final');
    expect(output).toMatchObject({ content });
  });

  it('treats a JSON answer without kind="tool" as final content', () => {
    // Asking a coding agent for a JSON config produces a valid JSON object.
    // Routing that to the repair loop would fail a correct answer.
    const content = '{"name":"claw","version":"1.0.0"}';

    expect(parseRuntimeV2ModelOutput(content)).toEqual({ kind: 'final', content });
  });

  it('treats a json-fenced answer without kind="tool" as final content', () => {
    const content = '```json\n{"port":4002}\n```';

    expect(parseRuntimeV2ModelOutput(content)).toEqual({ kind: 'final', content });
  });

  it('treats prose that merely starts with a brace as final content', () => {
    const content = '{ this is not valid json at all';

    expect(parseRuntimeV2ModelOutput(content)).toEqual({ kind: 'final', content });
  });

  it('still parses a real tool request, bare and json-fenced', () => {
    const request = {
      kind: 'tool',
      toolName: 'workspace.read',
      toolVersion: '1.0.0',
      operation: 'read',
      arguments: { pathHandle: 'opaque_handle_1' },
      targetId: 'runtime_target_00001',
    };

    expect(parseRuntimeV2ModelOutput(JSON.stringify(request))).toEqual(request);
    expect(parseRuntimeV2ModelOutput(`\`\`\`json\n${JSON.stringify(request)}\n\`\`\``)).toEqual(
      request,
    );
  });

  it('still raises on a declared but malformed tool request so repair can run', () => {
    // Widening the "this is an answer" path must not swallow a genuine attempt.
    expect(() => parseRuntimeV2ModelOutput('{"kind":"tool","toolName":"x"}')).toThrow();
  });
});
