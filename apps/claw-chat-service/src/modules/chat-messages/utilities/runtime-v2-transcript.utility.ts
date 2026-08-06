import {
  RUNTIME_V2_TRANSCRIPT_REQUEST_PREFIX,
  RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS,
  RUNTIME_V2_TRANSCRIPT_RESULT_PREFIX,
  RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE,
} from '../constants/runtime-v2-transcript.constants';
import type { RuntimeResultDto, ToolInvocationDto } from '../dto/runtime-v2.dto';

/**
 * The transcript line recording a tool the model asked for.
 *
 * Stored as the assistant's own turn, so on the next continuation the model
 * reads back exactly what it requested rather than re-deriving it. The
 * arguments are included because "I already listed apps/" is only useful if the
 * arguments are visible — without them a repeated call looks like a new one.
 */
export function buildRuntimeV2ToolRequestRecord(invocation: ToolInvocationDto): string {
  return `${RUNTIME_V2_TRANSCRIPT_REQUEST_PREFIX}: ${invocation.toolName}/${invocation.operation} ${JSON.stringify(invocation.arguments)}`;
}

/**
 * The transcript line recording what a tool returned.
 *
 * It follows the request it answers, so it does not repeat the tool name: the
 * adjacency carries that, the same way an ordinary chat transcript does.
 */
export function buildRuntimeV2ToolResultRecord(result: RuntimeResultDto['result']): string {
  const document = JSON.stringify({
    status: result.status,
    structured: result.structured ?? null,
    modelText: result.modelText ?? null,
    error: result.error ?? null,
  });
  return `${RUNTIME_V2_TRANSCRIPT_RESULT_PREFIX}: ${bounded(document)}`;
}

function bounded(document: string): string {
  if (document.length <= RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS) return document;
  const room =
    RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS - RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE.length;
  return `${document.slice(0, room)}${RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE}`;
}
