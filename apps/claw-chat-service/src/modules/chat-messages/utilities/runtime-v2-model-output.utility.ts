import {
  RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
  RUNTIME_V2_CAPABILITY_DENIAL_PATTERNS,
  RUNTIME_V2_MODEL_INSTRUCTION,
  RUNTIME_V2_REPAIR_INSTRUCTION,
  runtimeV2ToolRequestSchema,
} from '../constants/runtime-v2-model-output.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { RuntimeV2ModelOutput } from '../types/runtime-v2-model-output.types';

export {
  RUNTIME_V2_CAPABILITY_CORRECTION_INSTRUCTION,
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
  return trimmed.startsWith('{') ? trimmed : null;
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

export function parseRuntimeV2ModelOutput(
  content: string,
  definitions?: readonly ToolDefinitionDto[],
): RuntimeV2ModelOutput {
  const candidate = jsonCandidate(content);
  if (candidate === null) return { kind: 'final', content };

  let document: unknown;
  try {
    document = JSON.parse(candidate);
  } catch {
    // Not one JSON document. It may still be several concatenated tool
    // requests, which is the common shape when the model plans a multi-part
    // task, so retry against the first complete object before giving up.
    const first = firstJsonObject(candidate);
    if (first === null) return { kind: 'final', content };
    try {
      document = JSON.parse(first);
    } catch {
      // Looked like JSON and is not. That is prose or code the model happened
      // to start with a brace, not an attempt at a tool request, so it is
      // answered rather than repaired.
      return { kind: 'final', content };
    }
  }

  // `kind: "tool"` is the schema's discriminator, so it is also the only honest
  // signal that the model was ATTEMPTING a tool request. A model asked to
  // produce a JSON config answers with a perfectly good JSON object that has no
  // `kind` — that is an answer, and sending it to the repair loop would fail a
  // correct response.
  if (!isToolRequestAttempt(document)) return { kind: 'final', content };

  // Past this point the model declared a tool request, so a schema failure is a
  // genuinely malformed one and still raises for the repair loop.
  const parsed = runtimeV2ToolRequestSchema.safeParse(document);
  if (!parsed.success) throw parsed.error;
  if (definitions !== undefined) assertAdmittedTool(parsed.data, definitions);
  return parsed.data;
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
