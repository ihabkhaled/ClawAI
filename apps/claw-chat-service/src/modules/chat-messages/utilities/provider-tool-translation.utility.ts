// Translates the admitted Runtime V2 tool catalog into provider-native tool
// specs, and translates provider tool calls back into the exact field set
// `toolInvocationSchema` requires.
//
// Shape decision: ONE native function per tool, with `operation` and `targetId`
// lifted into the function's parameter schema.
//
// Why not one function per operation: the registered catalog is 17 tools over
// ~145 operations. 145 functions blows every provider's practical catalog size
// and dominates the per-turn token budget. Why lifting works: a Runtime V2
// `inputSchema` is already a flat superset covering all of a tool's
// operations, while `operation` and `targetId` live *outside* `arguments` in
// `ToolInvocation`. Lifting them into the schema is therefore lossless and the
// reverse mapping is total.
//
// Deliberately NOT enabling OpenAI `strict: true`: strict mode requires every
// property to appear in `required` at every nesting level, and Runtime V2
// schemas emit `required: []`. Enabling it would reject the whole catalog.
//
// Pure: no I/O, no logger, no vendor SDK.

import { ProviderToolDialect } from '../../../common/enums';
import { BusinessException } from '../../../common/errors';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type {
  AnthropicContentBlock,
  AnthropicMessage,
} from '../types/anthropic-message-shape.types';
import type { OllamaChatMessage, OpenAiChatMessage } from '../types/execution.types';
import type {
  AnthropicToolSpec,
  NormalizedToolCall,
  OpenAiToolSpec,
  ProviderToolSpec,
  ToolNameLookup,
  ToolNameLookupEntry,
  TranslatedToolCatalog,
} from '../types/provider-tool.types';
import type { ToolTurn } from '../types/tool-turn.types';
import {
  ANTHROPIC_TEXT_BLOCK_TYPE,
  ANTHROPIC_TOOL_RESULT_BLOCK_TYPE,
  ANTHROPIC_TOOL_USE_BLOCK_TYPE,
  NATIVE_TOOL_NAME_ILLEGAL_PATTERN,
  NATIVE_TOOL_NAME_MAX_LENGTH,
  NATIVE_TOOL_NAME_REPLACEMENT,
  PROVIDER_TOOL_FUNCTION_TYPE,
  PROVIDER_TOOL_SCHEMA_TYPE_OBJECT,
  PROVIDER_TOOL_SCHEMA_TYPE_STRING,
  ROLE_ASSISTANT,
  ROLE_TOOL,
  ROLE_USER,
  SYNTHETIC_TOOL_CALL_ID_PREFIX,
  TOOL_ARGUMENTS_PROPERTY,
  TOOL_OPERATION_PROPERTY,
  TOOL_RESULT_CONTENT_MAX_CHARS,
  TOOL_RESULT_TRUNCATION_MARKER,
  TOOL_TARGET_ID_PROPERTY,
} from '../constants/provider-tool.constants';

// Maps a Runtime tool name onto the strictest provider charset
// (`^[a-zA-Z0-9_-]{1,64}$`). This is intentionally lossy — `workspace.files`
// and a hypothetical `workspace_files` both become `workspace_files` — which
// is exactly why translateToolCatalog asserts uniqueness and why the reverse
// trip goes through the lookup table instead of a string replacement.
export function sanitizeNativeToolName(toolName: string): string {
  return toolName
    .replaceAll(NATIVE_TOOL_NAME_ILLEGAL_PATTERN, NATIVE_TOOL_NAME_REPLACEMENT)
    .slice(0, NATIVE_TOOL_NAME_MAX_LENGTH);
}

export function translateToolCatalog(
  definitions: readonly ToolDefinitionDto[],
  dialect: ProviderToolDialect,
): TranslatedToolCatalog {
  const specs: ProviderToolSpec[] = [];
  const lookup = new Map<string, ToolNameLookupEntry>();

  for (const definition of definitions) {
    const nativeName = sanitizeNativeToolName(definition.name);
    const existing = lookup.get(nativeName);
    if (existing) {
      throw new BusinessException(
        `Tool names "${existing.toolName}" and "${definition.name}" both map to the native name "${nativeName}"`,
        'RUNTIME_TOOL_CATALOG_INVALID',
      );
    }
    lookup.set(nativeName, {
      nativeName,
      toolName: definition.name,
      toolVersion: definition.version,
      operations: definition.operations,
      targetIds: definition.targetIds,
    });
    specs.push(buildToolSpec(definition, nativeName, dialect));
  }

  return { specs, lookup, byteSize: Buffer.byteLength(JSON.stringify(specs), 'utf8') };
}

// Narrowing accessors. `translateToolCatalog` returns the union because the
// dialect is a runtime value; these recover the concrete shape without a type
// assertion, so a dialect/shape mismatch yields an empty tool list (visible in
// the request) rather than a body the provider rejects with an opaque 400.
export function toOpenAiToolSpecs(specs: readonly ProviderToolSpec[]): OpenAiToolSpec[] {
  return specs.filter((spec): spec is OpenAiToolSpec => 'function' in spec);
}

export function toAnthropicToolSpecs(specs: readonly ProviderToolSpec[]): AnthropicToolSpec[] {
  return specs.filter((spec): spec is AnthropicToolSpec => 'input_schema' in spec);
}

// Recovers `{toolName, toolVersion, operation, targetId, arguments}` from a raw
// provider response. Throws rather than guessing: a wrong reverse mapping would
// dispatch a potentially destructive tool, so an explicit repairable failure is
// strictly safer than a best-effort match.
export function normalizeToolCalls(
  raw: unknown,
  dialect: ProviderToolDialect,
  lookup: ToolNameLookup,
): readonly NormalizedToolCall[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const calls: NormalizedToolCall[] = [];
  for (const [index, entry] of raw.entries()) {
    const extracted = extractRawCall(entry, dialect, index);
    if (!extracted) continue;
    calls.push(normalizeSingleCall(extracted, lookup));
  }
  return calls;
}

// ── Per-dialect transcript rendering ────────────────────────────────────────
//
// Each dialect renders the same neutral ToolTurn into its own wire shape.
// Anthropic is the reason this is not a single canonical shape converted
// downstream: its tool result is a `user` turn carrying `tool_result` blocks,
// which a role-preserving transform cannot produce from an OpenAI `tool` turn.

export function buildOpenAiToolTurnMessages(
  turns: readonly ToolTurn[],
): readonly OpenAiChatMessage[] {
  const messages: OpenAiChatMessage[] = [];
  for (const turn of turns) {
    messages.push({
      role: ROLE_ASSISTANT,
      content: turn.assistantText,
      tool_calls: turn.calls.map((call) => ({
        id: call.callId,
        type: PROVIDER_TOOL_FUNCTION_TYPE,
        function: { name: call.nativeName, arguments: JSON.stringify(call.arguments) },
      })),
    });
    for (const result of turn.results) {
      messages.push({
        role: ROLE_TOOL,
        content: truncateToolResultContent(result.content),
        tool_call_id: result.callId,
      });
    }
  }
  return messages;
}

export function buildOllamaToolTurnMessages(
  turns: readonly ToolTurn[],
): readonly OllamaChatMessage[] {
  const messages: OllamaChatMessage[] = [];
  for (const turn of turns) {
    messages.push({
      role: ROLE_ASSISTANT,
      content: turn.assistantText,
      tool_calls: turn.calls.map((call) => ({
        id: call.callId,
        type: PROVIDER_TOOL_FUNCTION_TYPE,
        function: { name: call.nativeName, arguments: call.arguments },
      })),
    });
    for (const result of turn.results) {
      messages.push({
        role: ROLE_TOOL,
        content: truncateToolResultContent(result.content),
        tool_call_id: result.callId,
      });
    }
  }
  return messages;
}

export function buildAnthropicToolTurnMessages(
  turns: readonly ToolTurn[],
): readonly AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];
  for (const turn of turns) {
    const assistantBlocks: AnthropicContentBlock[] = [];
    if (turn.assistantText.trim().length > 0) {
      assistantBlocks.push({ type: ANTHROPIC_TEXT_BLOCK_TYPE, text: turn.assistantText });
    }
    for (const call of turn.calls) {
      assistantBlocks.push({
        type: ANTHROPIC_TOOL_USE_BLOCK_TYPE,
        id: call.callId,
        name: call.nativeName,
        input: call.arguments,
      });
    }
    messages.push({ role: ROLE_ASSISTANT, content: assistantBlocks });
    if (turn.results.length > 0) {
      messages.push({
        role: ROLE_USER,
        content: turn.results.map((result) => ({
          type: ANTHROPIC_TOOL_RESULT_BLOCK_TYPE,
          tool_use_id: result.callId,
          content: truncateToolResultContent(result.content),
          is_error: result.isError,
        })),
      });
    }
  }
  return messages;
}

export function truncateToolResultContent(content: string): string {
  if (content.length <= TOOL_RESULT_CONTENT_MAX_CHARS) {
    return content;
  }
  return content.slice(0, TOOL_RESULT_CONTENT_MAX_CHARS) + TOOL_RESULT_TRUNCATION_MARKER;
}

// ── internals ───────────────────────────────────────────────────────────────

function buildToolSpec(
  definition: ToolDefinitionDto,
  nativeName: string,
  dialect: ProviderToolDialect,
): ProviderToolSpec {
  const description = `${definition.description}\n\nOperations: ${definition.operations.join(', ')}`;
  const parameters = {
    type: PROVIDER_TOOL_SCHEMA_TYPE_OBJECT,
    properties: {
      [TOOL_OPERATION_PROPERTY]: {
        type: PROVIDER_TOOL_SCHEMA_TYPE_STRING,
        enum: [...definition.operations],
      },
      [TOOL_TARGET_ID_PROPERTY]: {
        type: PROVIDER_TOOL_SCHEMA_TYPE_STRING,
        enum: [...definition.targetIds],
      },
      // Verbatim. The Runtime contract already bounds this object, and any
      // rewriting here would let the model be told a schema the executor does
      // not actually enforce.
      [TOOL_ARGUMENTS_PROPERTY]: definition.inputSchema,
    },
    required: [TOOL_OPERATION_PROPERTY, TOOL_TARGET_ID_PROPERTY, TOOL_ARGUMENTS_PROPERTY],
    additionalProperties: false,
  };

  if (dialect === ProviderToolDialect.ANTHROPIC) {
    const anthropicSpec: AnthropicToolSpec = {
      name: nativeName,
      description,
      input_schema: parameters,
    };
    return anthropicSpec;
  }
  const openAiSpec: OpenAiToolSpec = {
    type: PROVIDER_TOOL_FUNCTION_TYPE,
    function: { name: nativeName, description, parameters },
  };
  return openAiSpec;
}

function extractRawCall(
  entry: unknown,
  dialect: ProviderToolDialect,
  index: number,
): { callId: string; nativeName: string; payload: unknown } | undefined {
  if (typeof entry !== 'object' || entry === null) {
    return undefined;
  }
  const record = entry as Record<string, unknown>;
  if (dialect === ProviderToolDialect.ANTHROPIC) {
    if (record['type'] !== ANTHROPIC_TOOL_USE_BLOCK_TYPE) {
      return undefined;
    }
    return {
      callId: readString(record['id']) ?? synthesizeCallId(index),
      nativeName: readString(record['name']) ?? '',
      payload: record['input'],
    };
  }
  const fn = record['function'];
  if (typeof fn !== 'object' || fn === null) {
    return undefined;
  }
  const fnRecord = fn as Record<string, unknown>;
  return {
    callId: readString(record['id']) ?? synthesizeCallId(index),
    nativeName: readString(fnRecord['name']) ?? '',
    // OpenAI-compatible providers send a JSON *string* here; native Ollama and
    // Anthropic send an object. Parsing is deferred to parseArgumentPayload so
    // both shapes converge without a per-dialect branch at every call site.
    payload: fnRecord['arguments'],
  };
}

function normalizeSingleCall(
  extracted: { callId: string; nativeName: string; payload: unknown },
  lookup: ToolNameLookup,
): NormalizedToolCall {
  const entry = lookup.get(extracted.nativeName);
  if (!entry) {
    throw new BusinessException(
      `Model requested unknown tool "${extracted.nativeName}"`,
      'MODEL_TOOL_UNKNOWN',
    );
  }
  const payload = parseArgumentPayload(extracted.payload, entry.toolName);
  const operation = readString(payload[TOOL_OPERATION_PROPERTY]);
  const targetId = readString(payload[TOOL_TARGET_ID_PROPERTY]);
  if (operation === undefined || !entry.operations.includes(operation)) {
    throw new BusinessException(
      `Model requested unknown operation "${String(operation)}" on tool "${entry.toolName}"`,
      'MODEL_TOOL_ARGUMENT_INVALID',
    );
  }
  if (targetId === undefined || !entry.targetIds.includes(targetId)) {
    throw new BusinessException(
      `Model requested unknown target "${String(targetId)}" on tool "${entry.toolName}"`,
      'MODEL_TOOL_ARGUMENT_INVALID',
    );
  }
  return {
    callId: extracted.callId,
    nativeName: entry.nativeName,
    toolName: entry.toolName,
    toolVersion: entry.toolVersion,
    operation,
    targetId,
    arguments: readRecord(payload[TOOL_ARGUMENTS_PROPERTY]) ?? {},
  };
}

function parseArgumentPayload(payload: unknown, toolName: string): Record<string, unknown> {
  if (typeof payload === 'string') {
    // An OpenAI-compatible provider that decides to emit no arguments sends an
    // empty string rather than "{}".
    if (payload.trim().length === 0) {
      return {};
    }
    try {
      const parsed: unknown = JSON.parse(payload);
      return (
        readRecord(parsed) ??
        (() => {
          throw new BusinessException(
            `Tool "${toolName}" arguments did not parse to an object`,
            'MODEL_TOOL_ARGUMENT_INVALID',
          );
        })()
      );
    } catch (error: unknown) {
      if (error instanceof BusinessException) throw error;
      throw new BusinessException(
        `Tool "${toolName}" arguments were not valid JSON`,
        'MODEL_TOOL_ARGUMENT_INVALID',
      );
    }
  }
  const record = readRecord(payload);
  if (!record) {
    throw new BusinessException(
      `Tool "${toolName}" arguments were missing or not an object`,
      'MODEL_TOOL_ARGUMENT_INVALID',
    );
  }
  return record;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
}

function synthesizeCallId(index: number): string {
  return `${SYNTHETIC_TOOL_CALL_ID_PREFIX}${String(index)}`;
}
