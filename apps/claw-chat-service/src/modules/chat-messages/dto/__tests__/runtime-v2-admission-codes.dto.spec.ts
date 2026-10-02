import { describe, expect, it } from 'vitest';

import { RUNTIME_V2_RISK_CLASSES } from '../../constants/runtime-v2.constants';
import { runtimeV2Sha256 } from '../../utilities/runtime-v2-identity.utility';
import { runtimeStartSchema } from '../runtime-v2.dto';

// Tool catalog admission: every rejection a client can fix names the field and
// carries a stable `code` (issue.params.code) the clients switch on.

const tool = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  schemaVersion: '2.0',
  name: 'workspace.file',
  version: '1.0.0',
  description: 'Read files.',
  operations: ['read'],
  riskClasses: ['inspect'],
  targetIds: ['target:workspace'],
  inputSchema: { type: 'object', additionalProperties: false },
  ...overrides,
});

const start = (toolDefinitions: unknown[]): Record<string, unknown> => ({
  schemaVersion: '2.0',
  threadId: 'thread_01JZZZZZZZZZZZZZZZZZZZZZZZ',
  clientRequestId: 'request_01JZZZZZZZZZZZZZZZZZZZZZZ',
  idempotencyKey: 'idem_01JZZZZZZZZZZZZZZZZZZZZZZZ',
  prompt: 'Describe the image.',
  manifestHash: `sha256:${'a'.repeat(64)}`,
  toolCatalogHash: runtimeV2Sha256(JSON.stringify(toolDefinitions)),
  toolDefinitions,
  provider: 'OLLAMA',
  model: 'kimi-k3',
  epochs: { account: 1, workspace: 1, target: 1, policy: 1 },
  budget: {
    maxModelTurns: 20,
    maxToolCalls: 30,
    maxToolRounds: 20,
    maxRepairAttempts: 1,
    maxRuntimeMs: 300_000,
    maxOutputBytes: 1_048_576,
    maxToolResultBytes: 262_144,
  },
});

const issuesOf = (value: Record<string, unknown>): { message: string; code: unknown }[] => {
  const result = runtimeStartSchema.safeParse(value);
  if (result.success) return [];
  return result.error.issues.map((issue) => ({
    message: issue.message,
    code: (issue as { params?: { code?: unknown } }).params?.code,
  }));
};

describe('tool description whitespace', () => {
  it('keeps the description byte for byte so the client hash still matches', () => {
    const definitions = [tool({ description: 'Read files.  \n' })];
    const parsed = runtimeStartSchema.parse(start(definitions));
    expect(runtimeV2Sha256(JSON.stringify(parsed.toolDefinitions))).toBe(
      runtimeV2Sha256(JSON.stringify(definitions)),
    );
  });

  it('still rejects a whitespace-only description', () => {
    expect(issuesOf(start([tool({ description: '   ' })])).length).toBeGreaterThan(0);
  });
});

describe('tool name collisions', () => {
  it('rejects names that normalise to the same native name, listing both', () => {
    const issues = issuesOf(
      start([tool({ name: 'workspace.file' }), tool({ name: 'workspace_file' })]),
    );
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('RUNTIME_TOOL_NAME_COLLISION');
    expect(issues[0]?.message).toContain('workspace.file');
    expect(issues[0]?.message).toContain('workspace_file');
  });

  it('accepts distinct names', () => {
    expect(issuesOf(start([tool(), tool({ name: 'workspace.search' })]))).toEqual([]);
  });
});

describe('risk class admission', () => {
  it('rejects an unknown class with the accepted values and a stable code', () => {
    const issues = issuesOf(start([tool({ riskClasses: ['vision'] })]));
    expect(issues).toHaveLength(1);
    expect(issues[0]?.code).toBe('RUNTIME_TOOL_RISK_CLASS_UNKNOWN');
    expect(issues[0]?.message).toContain('"vision"');
    for (const accepted of RUNTIME_V2_RISK_CLASSES) expect(issues[0]?.message).toContain(accepted);
  });

  it('accepts every fixed class', () => {
    for (const riskClass of RUNTIME_V2_RISK_CLASSES) {
      expect(issuesOf(start([tool({ riskClasses: [riskClass] })]))).toEqual([]);
    }
  });
});
