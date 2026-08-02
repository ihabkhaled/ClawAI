import {
  RUNTIME_V2_MODEL_INSTRUCTION,
  RUNTIME_V2_REPAIR_INSTRUCTION,
  runtimeV2ToolRequestSchema,
} from '../constants/runtime-v2-model-output.constants';
import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { RuntimeV2ModelOutput } from '../types/runtime-v2-model-output.types';

export { RUNTIME_V2_MODEL_INSTRUCTION, RUNTIME_V2_REPAIR_INSTRUCTION };
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

function jsonDocument(content: string): unknown {
  const trimmed = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/iu.exec(trimmed);
  const parsed: unknown = JSON.parse(fenced?.[1] ?? trimmed);
  return parsed;
}

export function parseRuntimeV2ModelOutput(
  content: string,
  definitions?: readonly ToolDefinitionDto[],
): RuntimeV2ModelOutput {
  const trimmed = content.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('```')) {
    return { kind: 'final', content };
  }
  const parsed = runtimeV2ToolRequestSchema.safeParse(jsonDocument(content));
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
