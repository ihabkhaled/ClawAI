import { ProviderToolDialect, ToolChoiceMode } from '../../../../common/enums';
import { BusinessException } from '../../../../common/errors';
import type { ToolDefinitionDto } from '../../dto/runtime-v2.dto';
import type { ToolTurn } from '../../types/tool-turn.types';
import type { AnthropicToolSpec, OpenAiToolSpec } from '../../types/provider-tool.types';
import {
  resolveToolChoicePayload,
  resolveToolDialect,
  supportsNativeTools,
} from '../provider-tool-dialect.utility';
import {
  buildAnthropicToolTurnMessages,
  buildOllamaToolTurnMessages,
  buildOpenAiToolTurnMessages,
  normalizeToolCalls,
  sanitizeNativeToolName,
  toAnthropicToolSpecs,
  toOpenAiToolSpecs,
  translateToolCatalog,
  truncateToolResultContent,
} from '../provider-tool-translation.utility';

// The real `workspace.files` shape, copied from the extension's
// runtime-tool-input-schemas.ts (`strict({...})` → required: [],
// additionalProperties: false, maxProperties: 64). Using the production shape
// is the point: the flat-superset schema plus `required: []` is exactly what
// makes OpenAI's `strict: true` unusable, and a synthetic fixture would hide it.
const TEXT = { type: 'string', maxLength: 1_048_576 } as const;
const INTEGER = { type: 'integer', minimum: 0, maximum: 16_777_216 } as const;

const WORKSPACE_FILES_OPERATIONS = [
  'stat',
  'list',
  'glob',
  'search',
  'read',
  'create',
  'update',
  'patch',
  'rename',
  'copy',
  'delete',
  'mkdir',
  'artifact',
  'transaction',
];

function filesDefinition(overrides: Partial<ToolDefinitionDto> = {}): ToolDefinitionDto {
  return {
    schemaVersion: '2.0',
    name: 'workspace.files',
    version: '2.0.0',
    description: 'Bounded workspace discovery, reads, and transactional file mutation.',
    operations: WORKSPACE_FILES_OPERATIONS,
    riskClasses: ['inspect', 'workspace-write'],
    targetIds: ['target:workspace'],
    inputSchema: {
      type: 'object',
      properties: {
        rootKey: TEXT,
        path: TEXT,
        startLine: INTEGER,
        endLine: INTEGER,
        maxBytes: INTEGER,
        pattern: TEXT,
        query: TEXT,
      },
      required: [],
      additionalProperties: false,
      maxProperties: 64,
    },
    ...overrides,
  } as ToolDefinitionDto;
}

describe('sanitizeNativeToolName', () => {
  it('maps a dotted Runtime tool name onto the provider charset', () => {
    expect(sanitizeNativeToolName('workspace.files')).toBe('workspace_files');
    expect(sanitizeNativeToolName('runtime.evidence')).toBe('runtime_evidence');
  });

  it('caps the name at the 64-character provider limit', () => {
    const long = `workspace.${'a'.repeat(120)}`;
    expect(sanitizeNativeToolName(long)).toHaveLength(64);
  });

  it('is deliberately NOT injective — which is why a lookup table is mandatory', () => {
    expect(sanitizeNativeToolName('workspace.files')).toBe(
      sanitizeNativeToolName('workspace_files'),
    );
  });
});

describe('translateToolCatalog', () => {
  it('lifts operation and targetId into the schema and keeps inputSchema byte-identical', () => {
    const definition = filesDefinition();

    const { specs } = translateToolCatalog([definition], ProviderToolDialect.OPENAI);

    const spec = toOpenAiToolSpecs(specs)[0] as OpenAiToolSpec;
    expect(spec.type).toBe('function');
    expect(spec.function.name).toBe('workspace_files');
    const properties = spec.function.parameters['properties'] as Record<string, unknown>;
    expect((properties['operation'] as { enum: string[] }).enum).toEqual(
      WORKSPACE_FILES_OPERATIONS,
    );
    expect((properties['targetId'] as { enum: string[] }).enum).toEqual(['target:workspace']);
    // Byte-identical: the model must be shown exactly the schema the executor
    // enforces, or the two drift apart silently.
    expect(JSON.stringify(properties['arguments'])).toBe(JSON.stringify(definition.inputSchema));
  });

  it('lists the operations in the description so the model can choose one', () => {
    const { specs } = translateToolCatalog([filesDefinition()], ProviderToolDialect.OPENAI);

    const spec = toOpenAiToolSpecs(specs)[0] as OpenAiToolSpec;
    expect(spec.function.description).toContain('Operations: stat, list, glob');
  });

  it('emits the Anthropic shape with input_schema instead of function.parameters', () => {
    const { specs } = translateToolCatalog([filesDefinition()], ProviderToolDialect.ANTHROPIC);

    const spec = toAnthropicToolSpecs(specs)[0] as AnthropicToolSpec;
    expect(spec.name).toBe('workspace_files');
    expect(spec.input_schema).toBeDefined();
    expect(spec).not.toHaveProperty('function');
  });

  it('emits the OpenAI function envelope for the Ollama dialect', () => {
    const { specs } = translateToolCatalog([filesDefinition()], ProviderToolDialect.OLLAMA);

    expect(toOpenAiToolSpecs(specs)).toHaveLength(1);
  });

  it('preserves required: [] and additionalProperties: false — proving strict:true would break', () => {
    const { specs } = translateToolCatalog([filesDefinition()], ProviderToolDialect.OPENAI);

    const spec = toOpenAiToolSpecs(specs)[0] as OpenAiToolSpec;
    const args = (spec.function.parameters['properties'] as Record<string, unknown>)[
      'arguments'
    ] as Record<string, unknown>;
    // OpenAI strict mode requires every property to appear in `required` at
    // every nesting level. Runtime V2 emits `required: []`, so enabling
    // `strict: true` would reject the entire catalog.
    expect(args['required']).toEqual([]);
    expect(args['additionalProperties']).toBe(false);
    expect(spec.function.parameters['additionalProperties']).toBe(false);
  });

  it('builds a reverse lookup keyed on the sanitized name', () => {
    const { lookup } = translateToolCatalog([filesDefinition()], ProviderToolDialect.OPENAI);

    expect(lookup.get('workspace_files')).toEqual({
      nativeName: 'workspace_files',
      toolName: 'workspace.files',
      toolVersion: '2.0.0',
      operations: WORKSPACE_FILES_OPERATIONS,
      targetIds: ['target:workspace'],
    });
  });

  it('throws at build time when two tool names collide after sanitization', () => {
    const definitions = [filesDefinition(), filesDefinition({ name: 'workspace_files' })];

    expect(() => translateToolCatalog(definitions, ProviderToolDialect.OPENAI)).toThrow(
      BusinessException,
    );
    expect(() => translateToolCatalog(definitions, ProviderToolDialect.OPENAI)).toThrow(
      /both map to the native name/u,
    );
  });

  it('reports the serialized catalog size so callers can budget the per-turn cost', () => {
    const { byteSize, specs } = translateToolCatalog(
      [filesDefinition()],
      ProviderToolDialect.OPENAI,
    );

    expect(byteSize).toBe(Buffer.byteLength(JSON.stringify(specs), 'utf8'));
    expect(byteSize).toBeGreaterThan(0);
  });
});

describe('normalizeToolCalls', () => {
  const { lookup } = translateToolCatalog([filesDefinition()], ProviderToolDialect.OPENAI);

  it('parses the OpenAI shape where arguments is a JSON STRING', () => {
    const raw = [
      {
        id: 'call_abc',
        type: 'function',
        function: {
          name: 'workspace_files',
          arguments: JSON.stringify({
            operation: 'read',
            targetId: 'target:workspace',
            arguments: { path: 'src/main.ts' },
          }),
        },
      },
    ];

    const calls = normalizeToolCalls(raw, ProviderToolDialect.OPENAI, lookup);

    expect(calls).toEqual([
      {
        callId: 'call_abc',
        nativeName: 'workspace_files',
        toolName: 'workspace.files',
        toolVersion: '2.0.0',
        operation: 'read',
        targetId: 'target:workspace',
        arguments: { path: 'src/main.ts' },
      },
    ]);
  });

  it('parses the Ollama shape where arguments is an OBJECT and id is absent', () => {
    const raw = [
      {
        function: {
          name: 'workspace_files',
          arguments: {
            operation: 'list',
            targetId: 'target:workspace',
            arguments: { path: 'src' },
          },
        },
      },
    ];

    const calls = normalizeToolCalls(raw, ProviderToolDialect.OLLAMA, lookup);

    expect(calls).toHaveLength(1);
    // Ollama frequently omits the id; one must be synthesized or the result
    // message cannot be correlated on the next turn.
    expect(calls[0]?.callId).toBe('call_0');
    expect(calls[0]?.operation).toBe('list');
    expect(calls[0]?.arguments).toEqual({ path: 'src' });
  });

  it('parses the Anthropic tool_use content block', () => {
    const raw = [
      { type: 'text', text: 'Let me look at that file.' },
      {
        type: 'tool_use',
        id: 'toolu_1',
        name: 'workspace_files',
        input: { operation: 'read', targetId: 'target:workspace', arguments: { path: 'a.ts' } },
      },
    ];

    const calls = normalizeToolCalls(raw, ProviderToolDialect.ANTHROPIC, lookup);

    // The text block is skipped, not treated as a malformed call.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.callId).toBe('toolu_1');
    expect(calls[0]?.toolName).toBe('workspace.files');
  });

  it('returns an empty list when the provider emitted no tool calls', () => {
    expect(normalizeToolCalls(undefined, ProviderToolDialect.OPENAI, lookup)).toEqual([]);
    expect(normalizeToolCalls([], ProviderToolDialect.OPENAI, lookup)).toEqual([]);
  });

  it('rejects a tool the catalog never advertised', () => {
    const raw = [{ function: { name: 'workspace_secrets', arguments: '{}' } }];

    expect(() => normalizeToolCalls(raw, ProviderToolDialect.OPENAI, lookup)).toThrow(
      /unknown tool/u,
    );
  });

  it('rejects an operation the tool does not declare', () => {
    const raw = [
      {
        function: {
          name: 'workspace_files',
          arguments: JSON.stringify({
            operation: 'exfiltrate',
            targetId: 'target:workspace',
            arguments: {},
          }),
        },
      },
    ];

    expect(() => normalizeToolCalls(raw, ProviderToolDialect.OPENAI, lookup)).toThrow(
      /unknown operation/u,
    );
  });

  it('rejects a target the tool does not declare', () => {
    const raw = [
      {
        function: {
          name: 'workspace_files',
          arguments: JSON.stringify({
            operation: 'read',
            targetId: 'target:production-db',
            arguments: {},
          }),
        },
      },
    ];

    expect(() => normalizeToolCalls(raw, ProviderToolDialect.OPENAI, lookup)).toThrow(
      /unknown target/u,
    );
  });

  it('rejects arguments that are not valid JSON rather than guessing', () => {
    const raw = [{ function: { name: 'workspace_files', arguments: '{not json' } }];

    expect(() => normalizeToolCalls(raw, ProviderToolDialect.OPENAI, lookup)).toThrow(
      /not valid JSON/u,
    );
  });

  it('treats an empty arguments string as an empty object', () => {
    const raw = [
      {
        function: {
          name: 'workspace_files',
          arguments: JSON.stringify({ operation: 'stat', targetId: 'target:workspace' }),
        },
      },
    ];

    const calls = normalizeToolCalls(raw, ProviderToolDialect.OPENAI, lookup);

    expect(calls[0]?.arguments).toEqual({});
  });
});

describe('tool turn rendering', () => {
  const turn: ToolTurn = {
    assistantText: 'Reading the entry point.',
    calls: [{ callId: 'call_1', nativeName: 'workspace_files', arguments: { operation: 'read' } }],
    results: [{ callId: 'call_1', content: 'export function main() {}', isError: false }],
  };

  it('renders an OpenAI assistant(tool_calls) then tool(result) pair, in order', () => {
    const messages = buildOpenAiToolTurnMessages([turn]);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('assistant');
    expect(messages[0]?.tool_calls?.[0]?.function.name).toBe('workspace_files');
    // OpenAI wants the arguments back as a JSON string.
    expect(typeof messages[0]?.tool_calls?.[0]?.function.arguments).toBe('string');
    expect(messages[1]?.role).toBe('tool');
    expect(messages[1]?.tool_call_id).toBe('call_1');
  });

  it('renders the Ollama pair with arguments as an OBJECT', () => {
    const messages = buildOllamaToolTurnMessages([turn]);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.tool_calls?.[0]?.function.arguments).toEqual({ operation: 'read' });
    expect(messages[1]?.role).toBe('tool');
  });

  it('renders the Anthropic result as a USER turn, not a tool turn', () => {
    const messages = buildAnthropicToolTurnMessages([turn]);

    expect(messages).toHaveLength(2);
    expect(messages[0]?.role).toBe('assistant');
    expect(messages[1]?.role).toBe('user');
    const resultBlocks = messages[1]?.content as Array<Record<string, unknown>>;
    expect(resultBlocks[0]?.['type']).toBe('tool_result');
    expect(resultBlocks[0]?.['tool_use_id']).toBe('call_1');
  });

  it('keeps assistant prose emitted alongside the tool call', () => {
    const anthropic = buildAnthropicToolTurnMessages([turn]);

    const assistantBlocks = anthropic[0]?.content as Array<Record<string, unknown>>;
    expect(assistantBlocks[0]).toEqual({ type: 'text', text: 'Reading the entry point.' });
  });

  it('omits an empty text block when the model emitted only a tool call', () => {
    const silent: ToolTurn = { ...turn, assistantText: '   ' };

    const assistantBlocks = buildAnthropicToolTurnMessages([silent])[0]?.content as Array<
      Record<string, unknown>
    >;

    expect(assistantBlocks).toHaveLength(1);
    expect(assistantBlocks[0]?.['type']).toBe('tool_use');
  });

  it('truncates an oversized tool result with an explicit marker', () => {
    const huge = 'x'.repeat(70_000);

    const truncated = truncateToolResultContent(huge);

    expect(truncated.length).toBeLessThan(huge.length);
    expect(truncated).toContain('[tool result truncated]');
  });

  it('leaves a result under the cap untouched', () => {
    expect(truncateToolResultContent('small')).toBe('small');
  });
});

describe('resolveToolDialect', () => {
  it.each([
    ['OPENAI', ProviderToolDialect.OPENAI],
    ['GEMINI', ProviderToolDialect.OPENAI],
    ['DEEPSEEK', ProviderToolDialect.OPENAI],
    ['GROK', ProviderToolDialect.OPENAI],
    ['LLAMACPP', ProviderToolDialect.OPENAI],
    ['ANTHROPIC', ProviderToolDialect.ANTHROPIC],
    ['AWS_BEDROCK', ProviderToolDialect.ANTHROPIC],
    ['OLLAMA', ProviderToolDialect.OLLAMA],
    ['local-ollama', ProviderToolDialect.OLLAMA],
  ])('maps %s to the %s dialect', (provider, expected) => {
    expect(resolveToolDialect(provider, true)).toBe(expected);
  });

  it('returns NONE for an unknown provider so no tools are attached', () => {
    expect(resolveToolDialect('SOME_CUSTOM_GATEWAY', true)).toBe(ProviderToolDialect.NONE);
    expect(supportsNativeTools(ProviderToolDialect.NONE)).toBe(false);
  });

  it('returns NONE for every provider when the feature is disabled', () => {
    expect(resolveToolDialect('OPENAI', false)).toBe(ProviderToolDialect.NONE);
  });
});

describe('resolveToolChoicePayload', () => {
  it('expresses REQUIRED as the OpenAI "required" string', () => {
    const choice = resolveToolChoicePayload(ToolChoiceMode.REQUIRED, ProviderToolDialect.OPENAI);

    expect(choice.openAi).toBe('required');
    expect(choice.degraded).toBe(false);
  });

  it('expresses REQUIRED as Anthropic {type:"any"}, not "required"', () => {
    const choice = resolveToolChoicePayload(ToolChoiceMode.REQUIRED, ProviderToolDialect.ANTHROPIC);

    expect(choice.anthropic).toEqual({ type: 'any' });
  });

  it('reports REQUIRED as degraded on native Ollama, which cannot force a call', () => {
    const choice = resolveToolChoicePayload(ToolChoiceMode.REQUIRED, ProviderToolDialect.OLLAMA);

    expect(choice.openAi).toBeUndefined();
    expect(choice.anthropic).toBeUndefined();
    // The anti-drift correction is prompt-only on this lane; callers must be
    // able to tell the user that rather than claiming a strict correction.
    expect(choice.degraded).toBe(true);
  });

  it('does not report AUTO as degraded on Ollama', () => {
    expect(resolveToolChoicePayload(ToolChoiceMode.AUTO, ProviderToolDialect.OLLAMA).degraded).toBe(
      false,
    );
  });

  it('defaults to auto', () => {
    expect(resolveToolChoicePayload(ToolChoiceMode.AUTO, ProviderToolDialect.OPENAI).openAi).toBe(
      'auto',
    );
    expect(resolveToolChoicePayload(ToolChoiceMode.NONE, ProviderToolDialect.OPENAI).openAi).toBe(
      'none',
    );
  });
});
