import { parseRuntimeV2ModelOutput } from '../runtime-v2-model-output.utility';

const request = JSON.stringify({
  kind: 'tool',
  toolName: 'workspace.files',
  toolVersion: '2.0.0',
  operation: 'read',
  arguments: { rootKey: 'workspace-1', path: 'a.ts' },
  targetId: 'target:workspace',
});

// The candidate slice started at the FIRST brace in the reply. Once a model
// explains itself — "I'll add the method { ... }" — or writes code around the
// request, that brace belongs to the prose, the slice is unbalanced, and a
// perfectly good tool request was reported as an object the model "did not
// finish". A live run lost a repository edit to exactly this.
describe('a tool request surrounded by prose', () => {
  it('finds the request after prose containing a brace', () => {
    const reply = `I will add the method { like this } and then continue.\n${request}`;

    expect(parseRuntimeV2ModelOutput(reply)).toMatchObject({
      kind: 'tool',
      toolName: 'workspace.files',
    });
  });

  it('finds the request after a fenced code sample', () => {
    const reply = [
      'Here is the shape I will use:',
      '```ts',
      'const a = { b: 1 };',
      '```',
      request,
    ].join('\n');

    expect(parseRuntimeV2ModelOutput(reply).kind).toBe('tool');
  });

  it('finds the request when a non-tool JSON object comes first', () => {
    const reply = `{"note":"planning"}\n${request}`;

    expect(parseRuntimeV2ModelOutput(reply).kind).toBe('tool');
  });

  it('still answers a reply that carries no tool request', () => {
    const reply = 'The config is { "a": 1 } and that is all.';

    expect(parseRuntimeV2ModelOutput(reply).kind).toBe('final');
  });

  it('still answers a plain JSON object the user asked for', () => {
    expect(parseRuntimeV2ModelOutput('{"name":"x","version":"1.0.0"}').kind).toBe('final');
  });
});
