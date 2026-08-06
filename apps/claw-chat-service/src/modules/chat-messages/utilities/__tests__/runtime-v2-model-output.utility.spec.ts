import { parseRuntimeV2ModelOutput } from '../runtime-v2-model-output.utility';

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
