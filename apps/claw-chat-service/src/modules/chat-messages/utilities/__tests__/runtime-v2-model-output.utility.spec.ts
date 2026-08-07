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

  it('accepts a labelled tool request, as a model reading its own transcript emits', () => {
    // qwen3.5 emitted a perfect request prefixed with "Tool request: " and it
    // was shown to the user as the answer, because the text did not start with
    // a brace. glm-5.2 did the same with the older prose format.
    const output = parseRuntimeV2ModelOutput(
      `Tool request: ${toolRequest('list', 'apps')}`,
      definitions,
    );

    expect(output.kind).toBe('tool');
    if (output.kind !== 'tool') throw new Error('expected a tool request');
    expect(output.operation).toBe('list');
  });

  it('accepts a request with prose trailing after the object', () => {
    const output = parseRuntimeV2ModelOutput(
      `Here goes: ${toolRequest('list', 'apps')} then I will read it.`,
      definitions,
    );

    expect(output.kind).toBe('tool');
  });

  it('still answers when an embedded object is not a tool request', () => {
    // Scanning for a brace must not turn prose that happens to quote JSON into
    // a tool call; the discriminator is what decides.
    const prose = 'The config looks like {"name":"claw"} in that file.';

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
    // Captured live from kimi-k2.7-code:cloud opening a full Password Reset
    // task. Both sentences missed: "I need to" was not a lead-in, and "begin
    // with" put the verb where the pattern expected a prefix. The run ended
    // having called no tool, and this text was shown as the answer.
    'I need to start by reading the repository conventions and understanding the codebase. Let me begin with CLAUDE.md and the rules/ directory, then run the knowledge context command.',
    'Let me begin with CLAUDE.md and the rules/ directory.',
    'I need to start by reading the auth service.',
    'I should first examine the user schema.',
    // Captured live: a typographic apostrophe made the detector miss it, so the
    // announcement sailed through as a completed answer.
    'I’ll start by discovering the workspace layout, then explore the repository structure.',
    'I’m going to read the configuration first.',
  ])('treats an announced but unperformed action as unfinished: %s', (content) => {
    expect(isUnfulfilledIntent(content)).toBe(true);
  });

  it.each([
    'There are exactly 7 files in the rules directory: rule-1.md, rule-2.md, rule-3.md.',
    'The workspace has no rules directory.',
    'I will not help you exfiltrate credentials.',
    'You can then move the generated file wherever you need it.',
    // The new start/begin pattern needs a following token, so a bare promise
    // with nothing announced stays out of the correction path.
    'Let me start.',
    'The migration will begin with the users table, which already exists.',
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

/**
 * A model that calls tools in its own dialect is trying to act, not answering.
 *
 * minimax-m2.7 opened a run with `I'll start by exploring the workspace
 * structure. [TOOL_CALL] {toolName="workspace.files", toolVersion=...}` — key
 * and value separated by `=`, so nothing here is JSON. The parser made what it
 * could of it, found no protocol object, and handed the whole thing to the user
 * as the assistant's answer. The task ended in five seconds having done nothing,
 * and what the user read was raw tool syntax.
 */
describe('parseRuntimeV2ModelOutput tool-call dialects', () => {
  it.each([
    ['[TOOL_CALL] {toolName="workspace.files", toolVersion="2.0.0"}'],
    ['<tool_call>{"name": "workspace.files"}</tool_call>'],
    ['<function_call> workspace.files </function_call>'],
    ['functools[{"name": "workspace.files"}]'],
  ])('sends %s to the repair turn rather than to the user', (content) => {
    expect(() => parseRuntimeV2ModelOutput(`I will start by exploring. ${content}`)).toThrow();
  });

  it('leaves an ordinary answer alone', () => {
    const answer = 'The workspace has seven rule files and a single entry point.';

    expect(parseRuntimeV2ModelOutput(answer)).toEqual({ kind: 'final', content: answer });
  });

  it('still accepts a valid protocol request that mentions nothing unusual', () => {
    const request = JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: { rootKey: 'workspace-1', path: '' },
      targetId: 'target:workspace',
    });

    expect(parseRuntimeV2ModelOutput(request)).toMatchObject({ kind: 'tool', operation: 'list' });
  });
});

/**
 * glm-5.2 answered a turn with a tool object that never closed. JSON.parse
 * rejected it, the reply fell through to the final-answer branch, and half a
 * tool request was shown to the user as the assistant's response.
 */
describe('parseRuntimeV2ModelOutput half-written tool requests', () => {
  it('repairs an object that opens as a tool request and never closes', () => {
    const truncated =
      '{"kind":"tool","toolName":"workspace.files","toolVersion":"2.0.0",' +
      '"operation":"list","arguments":{"rootKey":"workspace-1","path":"src","targetId":"target:worksp';

    expect(() => parseRuntimeV2ModelOutput(truncated)).toThrow();
  });

  it('leaves an answer that merely mentions JSON alone', () => {
    const answer = 'The config file contains {"kind":"config"} at its root.';

    expect(parseRuntimeV2ModelOutput(answer)).toEqual({ kind: 'final', content: answer });
  });

  it('still returns a complete request as a request', () => {
    const complete = JSON.stringify({
      kind: 'tool',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operation: 'list',
      arguments: { rootKey: 'workspace-1', path: 'src' },
      targetId: 'target:workspace',
    });

    expect(parseRuntimeV2ModelOutput(complete)).toMatchObject({ kind: 'tool', operation: 'list' });
  });
});

/**
 * Every one of these was recorded in a real VS Code window, in the final
 * confirmation round, as the answer a user was shown instead of their work.
 */
describe('parseRuntimeV2ModelOutput dialects seen in the confirmation round', () => {
  it('repairs a namespaced tool-call tag', () => {
    // Enterprise-locked, minimax-m2.7. `<tool_call>` was on the literal list and
    // `<minimax:tool_call>` was not, so the tag soup became the answer.
    const dialect = '<minimax:tool_call> <kind>"tool","toolName":"workspace.files"</kind>';

    expect(() => parseRuntimeV2ModelOutput(dialect)).toThrow();
  });

  it('repairs a tool object wrapped in a template literal', () => {
    // Ask mode, minimax-m2.7, after five real tool calls.
    const wrapped =
      '${JSON.stringify({"kind":"tool","toolName":"workspace.files","operation":"list"})}';

    expect(() => parseRuntimeV2ModelOutput(wrapped)).toThrow();
  });

  it('leaves an answer that merely names a tool alone', () => {
    const answer = 'I read seven files with the workspace.files tool and found no callers.';

    expect(parseRuntimeV2ModelOutput(answer)).toEqual({ kind: 'final', content: answer });
  });
});

describe('isUnfulfilledIntent verbs seen in the confirmation round', () => {
  it('catches a compile announcement written the way the model wrote it', () => {
    // Auto edit, minimax-m2.7, after twelve real tool calls.
    expect(
      isUnfulfilledIntent("Now I'll compile all the gathered information into the document."),
    ).toBe(true);
  });

  it('still lets a finished report through', () => {
    expect(isUnfulfilledIntent('I compiled the findings into ClawAI_Full_context.md.')).toBe(false);
  });
});
