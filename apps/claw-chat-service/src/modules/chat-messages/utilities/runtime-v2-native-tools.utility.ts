import { BusinessException } from '../../../common/errors';
import { RUNTIME_V2_TURN_EXECUTION_OPTIONS } from '../constants/runtime-v2-execution.constants';
import { runtimeV2ToolRequestSchema } from '../constants/runtime-v2-model-output.constants';
import { NATIVE_TOOL_CALL_REJECTION_CODES } from '../constants/runtime-v2-native-tools.constants';
import { assertAdmittedTool } from './runtime-v2-model-output.utility';

import type { ToolDefinitionDto } from '../dto/runtime-v2.dto';
import type { ExecutionOptions } from '../types/execution-options.types';
import type { NormalizedToolCall } from '../types/provider-tool.types';
import type { RuntimeV2ModelOutput } from '../types/runtime-v2-model-output.types';

/**
 * Execution options for one agent turn, declaring the run's admitted tools so
 * the provider layer can offer them natively.
 *
 * Without this the native lane was built and never used: every turn asked the
 * model to write its tool call as JSON inside the answer, and a reasoning model
 * such as gpt-oss spent the turn thinking and stopped with nothing to parse.
 * Whether the tools actually go out natively is the provider layer's call — it
 * drops them when the lane is off, the provider has no native tool surface, or
 * the catalog is over its byte budget, and the text lane still works then.
 */
export function runtimeV2TurnExecutionOptions(
  definitions: readonly ToolDefinitionDto[],
): ExecutionOptions {
  return definitions.length === 0
    ? RUNTIME_V2_TURN_EXECUTION_OPTIONS
    : { ...RUNTIME_V2_TURN_EXECUTION_OPTIONS, toolCatalog: definitions };
}

/**
 * The first native tool call as a Runtime V2 tool request, held to the same
 * schema and admitted-catalog check as one the model wrote as text.
 *
 * The loop runs one tool per turn and the model is asked again with each
 * result, so any further calls in the same turn are left for it to repeat.
 * Returns null when the provider made no native call.
 */
export function runtimeV2OutputFromNativeCalls(
  calls: readonly NormalizedToolCall[] | undefined,
  definitions: readonly ToolDefinitionDto[],
): RuntimeV2ModelOutput | null {
  const first = calls?.at(0);
  if (first === undefined) return null;
  const request = runtimeV2ToolRequestSchema.parse({
    kind: 'tool',
    toolName: first.toolName,
    toolVersion: first.toolVersion,
    operation: first.operation,
    targetId: first.targetId,
    arguments: first.arguments,
  });
  assertAdmittedTool(request, definitions);
  return request;
}

/**
 * Waits for one provider turn, keeping a rejected native tool call as a value
 * so the repair loop can answer it. Every other failure still throws.
 */
export async function settleNativeTurn<T>(
  turn: Promise<T>,
): Promise<
  | { readonly response: T; readonly error?: undefined }
  | { readonly response?: undefined; readonly error: unknown }
> {
  try {
    return { response: await turn };
  } catch (error: unknown) {
    if (isNativeToolCallRejection(error)) return { error };
    throw error;
  }
}

function isNativeToolCallRejection(error: unknown): boolean {
  return (
    error instanceof BusinessException &&
    (NATIVE_TOOL_CALL_REJECTION_CODES as readonly string[]).includes(error.code)
  );
}
