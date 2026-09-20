import { runtimeStartSchema } from '../runtime-v2.dto';
import { RUNTIME_V2_MAX_FILE_IDS } from '../../constants/runtime-v2.constants';

const start = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  schemaVersion: '2.0',
  threadId: 'thread_01JZZZZZZZZZZZZZZZZZZZZZZZ',
  clientRequestId: 'request_01JZZZZZZZZZZZZZZZZZZZZZZ',
  idempotencyKey: 'idem_01JZZZZZZZZZZZZZZZZZZZZZZZ',
  prompt: 'Summarise the attached runbook.',
  manifestHash: `sha256:${'a'.repeat(64)}`,
  toolCatalogHash: `sha256:${'b'.repeat(64)}`,
  // A run admits at least one tool; an empty catalog is rejected on its own
  // and would make these assertions about the wrong field.
  toolDefinitions: [
    {
      schemaVersion: '2.0',
      name: 'workspace.file',
      version: '2.0.0',
      description: 'Read and write files in the workspace.',
      operations: ['read'],
      riskClasses: ['inspect'],
      targetIds: ['target:workspace'],
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    },
  ],
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
  ...overrides,
});

/**
 * Attachments on an agent run.
 *
 * The schema is `.strict()` and had no `fileIds`, so a client that sent one
 * was rejected outright and a client that did not send one lost the user's
 * file silently. Asking the agent to *do* something with a dropped file
 * therefore discarded it, while asking about the same file conversationally
 * worked — that path posts an ordinary chat message, which has always carried
 * attachments.
 */
describe('runtimeStartSchema attachments', () => {
  it('accepts the files the user attached', () => {
    const result = runtimeStartSchema.safeParse(start({ fileIds: ['file-1', 'file-2'] }));

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fileIds).toEqual(['file-1', 'file-2']);
  });

  it('still accepts a run with no attachment at all', () => {
    // Every existing client sends none, and none of them may start failing.
    const result = runtimeStartSchema.safeParse(start());

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fileIds).toBeUndefined();
  });

  it('refuses more attachments than a run may carry', () => {
    // Each id is looked up and its extracted text assembled into the prompt,
    // so an unbounded list is an unbounded context cost chosen by the client.
    const tooMany = Array.from({ length: RUNTIME_V2_MAX_FILE_IDS + 1 }, (_, i) => `file-${i}`);

    expect(runtimeStartSchema.safeParse(start({ fileIds: tooMany })).success).toBe(false);
  });

  it('refuses an empty id, which would look up nothing', () => {
    expect(runtimeStartSchema.safeParse(start({ fileIds: [''] })).success).toBe(false);
  });

  it('refuses a fileIds value that is not a list', () => {
    expect(runtimeStartSchema.safeParse(start({ fileIds: 'file-1' })).success).toBe(false);
  });
});
