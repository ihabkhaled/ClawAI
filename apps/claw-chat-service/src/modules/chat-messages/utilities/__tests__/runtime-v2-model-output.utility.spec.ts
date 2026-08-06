import { isUnfulfilledIntent, parseRuntimeV2ModelOutput } from '../runtime-v2-model-output.utility';

const definitions = [
  {
    schemaVersion: '2.0' as const,
    name: 'workspace.files',
    version: '2.0.0',
    description: 'Bounded workspace discovery.',
    operations: ['list', 'read', 'search'],
    riskClasses: ['inspect' as const],
    targetIds: ['target:workspace'],
    inputSchema: {},
  },
];

const toolRequest = (operation: string, path: string): string =>
  JSON.stringify({
    kind: 'tool',
    toolName: 'workspace.files',
    toolVersion: '2.0.0',
    operation,
    arguments: { rootKey: 'workspace-1', path },
    targetId: 'target:workspace',
  });

describe('parseRuntimeV2ModelOutput', () => {
  it('takes the first request when the model concatenates several', () => {
    // A model planning a multi-part task answers with several tool objects in
    // one response. JSON.parse rejects `{…} {…}` outright, so the reply fell
    // through to the final-answer branch and the raw JSON was streamed to the
    // user as the assistant's response — asking for workspace context produced
    // a wall of tool JSON and no work at all. The protocol carries one
    // invocation per turn, so the first is taken and the loop asks again.
    const content = [
      toolRequest('read', 'README.md'),
      toolRequest('read', 'package.json'),
      toolRequest('list', 'apps'),
      toolRequest('list', 'docs'),
    ].join(' ');

    const output = parseRuntimeV2ModelOutput(content, definitions);

    expect(output.kind).toBe('tool');
    if (output.kind !== 'tool') throw new Error('expected a tool request');
    expect(output.operation).toBe('read');
    expect(output.arguments).toMatchObject({ path: 'README.md' });
  });

  it('is not confused by a brace inside an argument string', () => {
    // Brace matching has to honour string literals, or a value containing a
    // closing brace would end the scan early and yield invalid JSON.
    const content = `${JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'search',
      arguments: { rootKey: 'workspace-1', query: 'function x() { return "}"; }' },
      targetId: 'target:workspace',
    })} ${toolRequest('list', 'apps')}`;

    const output = parseRuntimeV2ModelOutput(content, definitions);

    expect(output.kind).toBe('tool');
    if (output.kind !== 'tool') throw new Error('expected a tool request');
    expect(output.operation).toBe('search');
  });

  it('still treats a single valid request exactly as before', () => {
    const output = parseRuntimeV2ModelOutput(toolRequest('list', 'apps'), definitions);

    expect(output.kind).toBe('tool');
    if (output.kind !== 'tool') throw new Error('expected a tool request');
    expect(output.operation).toBe('list');
  });

  it('leaves plain prose and fenced code as the final answer', () => {
    expect(parseRuntimeV2ModelOutput('Here is the summary.', definitions)).toEqual({
      kind: 'final',
      content: 'Here is the summary.',
    });
    // A fenced shell snippet is an answer, not a malformed tool request.
    const shell = '```bash\nnpm run build\n```';
    expect(parseRuntimeV2ModelOutput(shell, definitions)).toEqual({
      kind: 'final',
      content: shell,
    });
  });

  it('treats a JSON answer without the discriminator as an answer', () => {
    // A model asked to produce a JSON config returns a perfectly good object
    // that has no `kind`. Repairing that would fail a correct response.
    const config = '{"name":"claw","version":"1.0.0"}';

    expect(parseRuntimeV2ModelOutput(config, definitions)).toEqual({
      kind: 'final',
      content: config,
    });
  });

  it('answers rather than repairs when the text merely starts with a brace', () => {
    const prose = '{ this is not json at all';

    expect(parseRuntimeV2ModelOutput(prose, definitions)).toEqual({
      kind: 'final',
      content: prose,
    });
  });

  it('rejects a tool outside the admitted catalog', () => {
    const rogue = JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.destroy',
      toolVersion: '2.0.0',
      operation: 'delete',
      arguments: {},
      targetId: 'target:workspace',
    });

    expect(() => parseRuntimeV2ModelOutput(rogue, definitions)).toThrow(
      'Model requested a tool outside the admitted tool catalog',
    );
  });
});

describe('isUnfulfilledIntent', () => {
  // Every one of these was captured from a live run against a real workspace
  // and was stored as the completed answer, so the task stopped after one step
  // while reporting success.
  it.each([
    "I'll explore the workspace to understand its structure and then generate document context for you. Let me start by discovering the top-level layout.",
    "I'll generate a comprehensive workspace context document. Let me start by discovering the workspace structure.",
    'Starting analysis now — first reading the top-level README and package manifest.',
    "I'll gather the full context from the codebase and write it inside the workspace.",
    'Let me first list the rules directory so I can count the files.',
    "Next, I'll read the service catalog.",
  ])('treats an announced but unperformed action as unfinished: %s', (content) => {
    expect(isUnfulfilledIntent(content)).toBe(true);
  });

  it.each([
    'There are exactly 7 files in the rules directory: rule-1.md, rule-2.md, rule-3.md.',
    'The workspace has no rules directory.',
    'I will not help you exfiltrate credentials.',
    'You can then move the generated file wherever you need it.',
    '',
  ])('leaves a real answer alone: %s', (content) => {
    expect(isUnfulfilledIntent(content)).toBe(false);
  });

  it('leaves a long deliverable alone even when it opens with a promise', () => {
    // An announcement is short; a genuine answer carries the work with it, and
    // must never be sent back for another turn.
    const deliverable = `I'll list them here:\n${'- apps/claw-chat-service holds the chat runtime.\n'.repeat(
      60,
    )}`;

    expect(deliverable.length).toBeGreaterThan(1_200);
    expect(isUnfulfilledIntent(deliverable)).toBe(false);
  });
});
