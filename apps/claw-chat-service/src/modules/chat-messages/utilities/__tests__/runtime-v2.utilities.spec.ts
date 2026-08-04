import { describe, expect, it } from '@jest/globals';

import {
  buildRuntimeV2ModelInstruction,
  isCapabilityDenial,
  parseRuntimeV2ModelOutput,
} from '../runtime-v2-model-output.utility';
import {
  createRuntimeV2Identity,
  runtimeV2Sha256,
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
