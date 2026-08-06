import {
  RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS,
  RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE,
} from '../constants/runtime-v2-transcript.constants';
import type { RuntimeResultDto, ToolInvocationDto } from '../dto/runtime-v2.dto';

/**
 * The transcript line recording a tool the model asked for, in the exact wire
 * shape the protocol requires it to emit.
 *
 * It used to read `Tool request: workspace.files/list {…}`. The model reads its
 * own history to decide what a request looks like, so it imitated that prose —
 * and prose is parsed as a final answer, which put the line
 * `Tool request: workspace.files/list {"rootKey":"workspace-1","path":"src"}`
 * in front of the user as the response and ended the task. Recording the same
 * JSON object the instruction demands makes imitation produce a valid request
 * instead of a wrong one.
 *
 * The arguments stay included because "I already listed apps/" is only useful
 * when the arguments are visible; without them a repeated call looks new.
 */
export function buildRuntimeV2ToolRequestRecord(invocation: ToolInvocationDto): string {
  return JSON.stringify({
    kind: 'tool',
    toolName: invocation.toolName,
    toolVersion: invocation.toolVersion,
    operation: invocation.operation,
    arguments: invocation.arguments,
    targetId: invocation.targetId,
  });
}

/**
 * The transcript line recording what a tool returned.
 *
 * It follows the request it answers and is stored under the tool role, so the
 * adjacency and the role carry the meaning — a prose label adds nothing and
 * costs something. glm-5.2 answered a request with the literal text
 * `Tool result: {"status":"succeeded",…}`: having been shown a labelled result
 * it produced a labelled result, and that was rendered to the user as the
 * answer. Both halves of the trail are now the bare documents they describe.
 */
export function buildRuntimeV2ToolResultRecord(result: RuntimeResultDto['result']): string {
  const document = JSON.stringify({
    status: result.status,
    structured: result.structured ?? null,
    modelText: result.modelText ?? null,
    error: result.error ?? null,
  });
  return bounded(document);
}

function bounded(document: string): string {
  if (document.length <= RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS) return document;
  const room =
    RUNTIME_V2_TRANSCRIPT_RESULT_CHARACTERS - RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE.length;
  return `${document.slice(0, room)}${RUNTIME_V2_TRANSCRIPT_TRUNCATION_NOTICE}`;
}
