import {
  RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
  RUNTIME_V2_CAPABILITY_DENIAL_PATTERNS,
  RUNTIME_V2_DIALECT_TOOL_CALL_MESSAGE,
  RUNTIME_V2_INTENT_CORRECTION_INSTRUCTION,
  RUNTIME_V2_MODEL_INSTRUCTION,
  RUNTIME_V2_REPAIR_INSTRUCTION,
  RUNTIME_V2_TOOL_CALL_DIALECT_MARKERS,
  RUNTIME_V2_TOOL_CALL_TAG_PATTERN,
  RUNTIME_V2_TOOL_REQUEST_KEY_ALIASES,
  RUNTIME_V2_TRUNCATED_TOOL_CALL_MESSAGE,
  RUNTIME_V2_TRUNCATED_TOOL_REQUEST_PATTERN,
  RUNTIME_V2_UNFULFILLED_INTENT_MAX_CHARACTERS,
  RUNTIME_V2_UNFULFILLED_INTENT_PATTERNS,
  runtimeV2ToolRequestSchema,
} from '../constants/runtime-v2-model-output.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { RuntimeV2ModelOutput } from '../types/runtime-v2-model-output.types';

export {
  RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
  RUNTIME_V2_INTENT_CORRECTION_INSTRUCTION,
  RUNTIME_V2_MODEL_INSTRUCTION,
  RUNTIME_V2_REPAIR_INSTRUCTION,
};
export type { RuntimeV2ModelOutput };

export function buildRuntimeV2ModelInstruction(definitions: readonly ToolDefinitionDto[]): string {
  const catalog = definitions.map((definition) => ({
    name: definition.name,
    version: definition.version,
    description: definition.description,
    operations: definition.operations,
    targetIds: definition.targetIds,
    inputSchema: definition.inputSchema,
  }));
  return [
    RUNTIME_V2_MODEL_INSTRUCTION,
    'Use only a tool, version, operation, and targetId listed in this admitted catalog:',
    JSON.stringify(catalog),
  ].join('\n');
}

export function isCapabilityDenial(content: string): boolean {
  const normalized = content.replaceAll(/\s+/gu, ' ').trim();
  if (normalized.length === 0) return false;
  return RUNTIME_V2_CAPABILITY_DENIAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * The model announced work and then ended its turn without requesting a tool.
 *
 * Observed repeatedly against a live workspace: "I'll explore the workspace to
 * understand its structure", "Let me start by discovering the workspace
 * structure", "Starting analysis now — first reading the top-level README".
 * Each was stored as the completed answer, so every multi-step task stopped
 * after one step while claiming success.
 *
 * The length bound is what keeps a genuine deliverable out of this path: an
 * announcement is short, and an answer that says "I'll list them here" carries
 * the list with it.
 */
export function isUnfulfilledIntent(content: string): boolean {
  const normalized = content.replaceAll(/\s+/gu, ' ').trim();
  if (normalized.length === 0 || normalized.length > RUNTIME_V2_UNFULFILLED_INTENT_MAX_CHARACTERS) {
    return false;
  }
  return RUNTIME_V2_UNFULFILLED_INTENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

/**
 * Returns the JSON text that could carry a tool request, or null when the reply
 * is plainly an answer.
 *
 * A fence only qualifies when it is untagged or tagged `json`. This matters
 * most for a CODING agent: answers routinely open with ```bash, ```ts or
 * ```python, and treating every fence as a candidate meant the raw markdown was
 * handed to JSON.parse, which threw `Unexpected token 'b', "bash` and failed
 * the whole run. A fenced shell snippet is an answer, not a malformed tool
 * request, and must not be routed through the repair path.
 */
function jsonCandidate(content: string): string | null {
  const trimmed = content.trim();
  const fenced = /^```([A-Za-z0-9_-]*)\r?\n?([\s\S]*?)\s*```$/u.exec(trimmed);
  if (fenced !== null) {
    const language = (fenced[1] ?? '').toLowerCase();
    if (language !== '' && language !== 'json') return null;
    const body = (fenced[2] ?? '').trim();
    return body.startsWith('{') ? body : null;
  }
  if (trimmed.startsWith('{')) return trimmed;
  // A model that has read its own transcript sometimes labels the object it
  // emits — `Tool request: {"kind":"tool",…}` — and qwen3.5 did exactly that
  // with an otherwise perfect request, which was then shown to the user as the
  // answer because the text did not begin with a brace. Scanning is safe
  // because the `kind: "tool"` discriminator below is what actually decides:
  // an object without it is still treated as an answer.
  const brace = trimmed.indexOf('{');
  return brace === -1 ? null : trimmed.slice(brace);
}

/**
 * Extracts the first complete top-level JSON object from a candidate string.
 *
 * Models routinely answer a multi-part question with several tool requests
 * concatenated — `{…} {…} {…}` — because nothing in the instruction says one
 * per turn. `JSON.parse` rejects that outright, the reply fell through to the
 * "this is a final answer" branch, and the raw JSON was streamed to the user as
 * the assistant's response. Asking for context on a workspace answered with a
 * wall of tool JSON and did no work at all.
 *
 * The protocol carries one invocation per turn, so the first request is taken
 * and the rest are dropped: the loop asks again with the result in hand, and
 * the model reissues whatever it still needs. Brace matching honours string
 * literals and escapes so a brace inside an argument value cannot end the scan
 * early.
 */
function firstJsonObject(text: string): string | null {
  if (!text.startsWith('{')) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);
    if (escaped) {
      escaped = false;
      continue;
    }
    if (inString) {
      if (character === '\\') escaped = true;
      else if (character === '"') inString = false;
      continue;
    }
    if (character === '"') inString = true;
    else if (character === '{') depth += 1;
    else if (character === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(0, index + 1);
    }
  }
  return null;
}

function isToolRequestAttempt(document: unknown): boolean {
  return (
    document !== null &&
    typeof document === 'object' &&
    !Array.isArray(document) &&
    (document as Record<string, unknown>)['kind'] === 'tool'
  );
}

/**
 * The model announced a tool call in its own dialect instead of the protocol's.
 *
 * Raising sends the turn to the repair loop, which asks for one valid protocol
 * object. The alternative — what happened before — is that the dialect text is
 * treated as the answer and shown to the user, so the run ends having done
 * nothing while displaying raw tool syntax.
 */
function assertNotDialectToolCall(content: string): void {
  const normalized = content.toLowerCase();
  if (
    RUNTIME_V2_TOOL_CALL_DIALECT_MARKERS.some((marker) => normalized.includes(marker)) ||
    RUNTIME_V2_TOOL_CALL_TAG_PATTERN.test(content)
  ) {
    throw new Error(RUNTIME_V2_DIALECT_TOOL_CALL_MESSAGE);
  }
  // A reply that opens with the protocol's own discriminator and then fails to
  // parse is a tool request that did not survive, not an answer. glm-5.2 sent
  // one whose object never closed, and half a tool request was shown to the
  // user as the assistant's response.
  if (RUNTIME_V2_TRUNCATED_TOOL_REQUEST_PATTERN.test(content)) {
    throw new Error(RUNTIME_V2_TRUNCATED_TOOL_CALL_MESSAGE);
  }
}

export function parseRuntimeV2ModelOutput(
  content: string,
  definitions?: readonly ToolDefinitionDto[],
): RuntimeV2ModelOutput {
  const candidate = jsonCandidate(content);
  if (candidate === null) {
    assertNotDialectToolCall(content);
    return { kind: 'final', content };
  }

  let document: unknown;
  try {
    document = JSON.parse(candidate);
  } catch {
    // Not one JSON document. It may still be several concatenated tool
    // requests, which is the common shape when the model plans a multi-part
    // task, so retry against the first complete object before giving up.
    const first = firstJsonObject(candidate);
    if (first === null) {
      assertNotDialectToolCall(content);
      return { kind: 'final', content };
    }
    try {
      document = JSON.parse(first);
    } catch {
      // Looked like JSON and is not. That is prose or code the model happened
      // to start with a brace, not an attempt at a tool request, so it is
      // answered rather than repaired.
      assertNotDialectToolCall(content);
      return { kind: 'final', content };
    }
  }

  // `kind: "tool"` is the schema's discriminator, so it is also the only honest
  // signal that the model was ATTEMPTING a tool request. A model asked to
  // produce a JSON config answers with a perfectly good JSON object that has no
  // `kind` — that is an answer, and sending it to the repair loop would fail a
  // correct response.
  if (!isToolRequestAttempt(document)) {
    assertNotDialectToolCall(content);
    return { kind: 'final', content };
  }

  // Past this point the model declared a tool request, so a schema failure is a
  // genuinely malformed one and still raises for the repair loop — but not
  // before the right value under a known wrong name has been put where the
  // schema expects it.
  const parsed = runtimeV2ToolRequestSchema.safeParse(withCanonicalToolKeys(document, definitions));
  if (!parsed.success) throw parsed.error;
  if (definitions !== undefined) assertAdmittedTool(parsed.data, definitions);
  return parsed.data;
}

/**
 * Renames the aliases in `RUNTIME_V2_TOOL_REQUEST_KEY_ALIASES` to the key the
 * protocol uses. For an admitted tool whose strict input schema cannot own a
 * `targetId` argument, it also lifts the observed legacy nested value into the
 * required outer field and removes that duplicate from strict tool input.
 *
 * A canonical key the model already supplied always wins, so a request carrying
 * both `toolVersion` and `version` keeps `toolVersion` and drops the alias
 * rather than letting the order of keys decide. Conflicting outer and nested
 * authority rejects instead of choosing one. A non-object is handed back
 * untouched for the schema to reject.
 */
export function withCanonicalToolKeys(
  document: unknown,
  definitions?: readonly ToolDefinitionDto[],
): unknown {
  if (!isRecord(document)) return document;
  const canonicalEntries: [string, unknown][] = [];
  for (const [key, value] of Object.entries(document)) {
    const alias = Object.entries(RUNTIME_V2_TOOL_REQUEST_KEY_ALIASES).find(
      ([candidate]) => candidate === key,
    )?.[1];
    if (alias === undefined) {
      canonicalEntries.push([key, value]);
      continue;
    }
    if (!Object.hasOwn(document, alias)) {
      canonicalEntries.push([alias, value]);
    }
  }
  return withCanonicalNestedTarget(Object.fromEntries(canonicalEntries), definitions);
}

function withCanonicalNestedTarget(
  canonical: Record<string, unknown>,
  definitions?: readonly ToolDefinitionDto[],
): Record<string, unknown> {
  const argumentsValue = canonical['arguments'];
  if (
    !isRecord(argumentsValue) ||
    !Object.hasOwn(argumentsValue, 'targetId') ||
    !canLiftNestedTarget(canonical, definitions)
  ) {
    return canonical;
  }
  const nestedTarget = argumentsValue['targetId'];
  if (Object.hasOwn(canonical, 'targetId') && canonical['targetId'] !== nestedTarget) {
    throw new Error('Model supplied conflicting targetId values');
  }
  return {
    ...canonical,
    arguments: withoutNestedTarget(argumentsValue),
    targetId: nestedTarget,
  };
}

function canLiftNestedTarget(
  canonical: Record<string, unknown>,
  definitions?: readonly ToolDefinitionDto[],
): boolean {
  if (definitions === undefined) return false;
  const toolName = canonical['toolName'];
  const toolVersion = canonical['toolVersion'];
  const definition = definitions.find(
    (candidate) => candidate.name === toolName && candidate.version === toolVersion,
  );
  if (definition === undefined) return false;
  const schema = definition.inputSchema;
  const properties = schema['properties'];
  return (
    schema['type'] === 'object' &&
    schema['additionalProperties'] === false &&
    Object.keys(schema).every(isSupportedObjectSchemaKeyword) &&
    isRecord(properties) &&
    !Object.hasOwn(properties, 'targetId')
  );
}

function isSupportedObjectSchemaKeyword(key: string): boolean {
  switch (key) {
    case 'additionalProperties':
    case 'description':
    case 'enum':
    case 'maxProperties':
    case 'minProperties':
    case 'properties':
    case 'required':
    case 'type':
      return true;
    default:
      return false;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function withoutNestedTarget(argumentsValue: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(argumentsValue).filter(([key]) => key !== 'targetId'));
}

function assertAdmittedTool(
  output: Extract<RuntimeV2ModelOutput, { readonly kind: 'tool' }>,
  definitions: readonly ToolDefinitionDto[],
): void {
  const definition = definitions.find(
    (candidate) => candidate.name === output.toolName && candidate.version === output.toolVersion,
  );
  if (
    definition === undefined ||
    !definition.operations.includes(output.operation) ||
    !definition.targetIds.includes(output.targetId)
  ) {
    throw new Error('Model requested a tool outside the admitted tool catalog');
  }
}
