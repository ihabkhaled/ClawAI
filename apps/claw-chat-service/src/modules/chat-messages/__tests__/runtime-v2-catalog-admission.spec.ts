import { randomUUID } from 'node:crypto';
import { toolDefinitionSchema } from '../dto/runtime-v2.dto';
import { RUNTIME_V2_ID_PATTERN, RUNTIME_V2_JSON_DEPTH } from '../constants/runtime-v2.constants';

// Admission-contract regression tests.
//
// Both bugs these cover reached production and killed every agent run at the
// start request. Neither was caught because nothing validated the DTO against
// the shapes the extension actually sends — the schema was tested against
// hand-written fixtures that happened to be shallow and happened to start with
// a letter.
//
// The schema fragments below are reproduced from the extension's
// runtime-tool-input-schemas.ts. They are deliberately literal rather than
// imported: the extension is a separate repository and a submodule, so a copy
// that drifts is a signal worth having, whereas an import would make this test
// silently follow whatever the extension does.

const text = { type: 'string', maxLength: 1_048_576 };
const integer = { type: 'integer', minimum: 0, maximum: 16_777_216 };
const wideInteger = { type: 'integer', minimum: 0, maximum: 1_000_000_000 };
const flag = { type: 'boolean' };
const texts = { type: 'array', items: text, maxItems: 10_000 };

const strict = (
  properties: Record<string, unknown>,
  required: readonly string[] = [],
): Record<string, unknown> => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
  maxProperties: 64,
});

const identifier = { type: 'string', minLength: 2, maxLength: 200 };
const epochs = strict({ account: integer, workspace: integer, target: integer, policy: integer }, [
  'account',
  'workspace',
  'target',
  'policy',
]);
const modelPolicy = strict(
  {
    allowedProviders: texts,
    allowedModels: texts,
    localPreferred: flag,
    minimumContextTokens: integer,
  },
  ['allowedProviders', 'allowedModels', 'localPreferred', 'minimumContextTokens'],
);
const taskBudget = strict(
  { maxTokens: integer, maxToolCalls: integer, maxRuntimeMs: wideInteger, maxRetries: integer },
  ['maxTokens', 'maxToolCalls', 'maxRuntimeMs', 'maxRetries'],
);
const subAgentTask = strict(
  {
    taskId: identifier,
    role: { type: 'string', enum: ['explorer', 'implementer', 'tester'] },
    goal: text,
    modelPolicy,
    contextNodeIds: texts,
    dependencies: texts,
    writeSet: texts,
    integrationSeams: texts,
    worktreeId: identifier,
    budget: taskBudget,
    tools: texts,
    riskCeiling: { type: 'string', enum: ['R0', 'R1', 'R2', 'R3'] },
    acceptanceChecks: texts,
    mandatoryGateIds: texts,
    epochs,
  },
  ['taskId', 'role', 'goal', 'modelPolicy'],
);
const subAgentGraph = strict(
  {
    graphId: identifier,
    parentRunId: identifier,
    tasks: { type: 'array', items: subAgentTask, minItems: 1, maxItems: 1_000 },
    maxConcurrency: integer,
  },
  ['graphId', 'parentRunId', 'tasks', 'maxConcurrency'],
);

/** The exact inputSchema `runtime.agents` ships — the deepest in the catalog. */
const AGENTS_INPUT_SCHEMA = strict({ graph: subAgentGraph }, ['graph']);

const agentsDefinition = {
  schemaVersion: '2.0',
  name: 'runtime.agents',
  version: '2.0.0',
  description: 'Run a bounded dependency graph of scoped coding sub-agents.',
  operations: ['run'],
  riskClasses: ['process', 'workspace-write', 'git-mutate'],
  targetIds: ['target:workspace'],
  inputSchema: AGENTS_INPUT_SCHEMA,
};

function jsonDepth(value: unknown): number {
  if (Array.isArray(value)) return 1 + Math.max(0, ...value.map(jsonDepth));
  if (value !== null && typeof value === 'object') {
    return 1 + Math.max(0, ...Object.values(value).map(jsonDepth));
  }
  return 0;
}

describe('runtime.agents admission — the tool that broke every agent run', () => {
  it('accepts the real runtime.agents definition', () => {
    // Shipped failing as: toolDefinitions.13.inputSchema.properties "Invalid
    // input" — an index and no reason, on every single start request.
    const result = toolDefinitionSchema.safeParse(agentsDefinition);

    expect(result.success).toBe(true);
  });

  it('has a schema deeper than the old limit of 8, which is why it failed', () => {
    // Pins the actual measurement so a future reduction of the depth budget
    // fails here rather than in production.
    expect(jsonDepth(AGENTS_INPUT_SCHEMA.properties)).toBeGreaterThan(8);
  });

  it('keeps headroom above the deepest real schema', () => {
    expect(RUNTIME_V2_JSON_DEPTH).toBeGreaterThan(jsonDepth(AGENTS_INPUT_SCHEMA.properties));
  });

  it('still rejects pathological nesting', () => {
    // The depth cap is a guard, not a formality — raising it must not disable
    // it. Build something well past the new limit.
    let deep: unknown = 'leaf';
    for (let i = 0; i < RUNTIME_V2_JSON_DEPTH + 5; i++) {
      deep = { nested: deep };
    }
    const result = toolDefinitionSchema.safeParse({
      ...agentsDefinition,
      inputSchema: { type: 'object', properties: deep },
    });

    expect(result.success).toBe(false);
  });
});

describe('RUNTIME_V2_ID_PATTERN — accepts the ids the extension actually generates', () => {
  it('accepts a UUID that starts with a digit', () => {
    // The extension builds clientRequestId with randomUUID(). 10 of the 16
    // possible leading hex characters are digits, so requiring a leading
    // LETTER rejected roughly 62% of agent runs — which looked like an
    // intermittent backend fault rather than a contract mismatch.
    expect(RUNTIME_V2_ID_PATTERN.test('7f3a9c21-4d5e-4a1b-9c8d-2e6f0a1b3c4d')).toBe(true);
  });

  it('accepts a UUID that starts with a letter', () => {
    expect(RUNTIME_V2_ID_PATTERN.test('af3a9c21-4d5e-4a1b-9c8d-2e6f0a1b3c4d')).toBe(true);
  });

  it('accepts every UUID a real generator produces', () => {
    // Directly exercises the failure: with the old pattern this fails within a
    // handful of iterations, essentially always across 200.
    for (let i = 0; i < 200; i++) {
      const id = randomUUID();
      expect(RUNTIME_V2_ID_PATTERN.test(id)).toBe(true);
    }
  });

  it('still rejects ids that are too short, too long, or use unsafe characters', () => {
    // Widening the first character must not weaken the actual bounds.
    expect(RUNTIME_V2_ID_PATTERN.test('short')).toBe(false);
    expect(RUNTIME_V2_ID_PATTERN.test(`a${'b'.repeat(200)}`)).toBe(false);
    expect(RUNTIME_V2_ID_PATTERN.test('has spaces here')).toBe(false);
    expect(RUNTIME_V2_ID_PATTERN.test('has/slash/chars')).toBe(false);
    expect(RUNTIME_V2_ID_PATTERN.test('../../etc/passwd')).toBe(false);
    expect(RUNTIME_V2_ID_PATTERN.test('')).toBe(false);
  });
});
