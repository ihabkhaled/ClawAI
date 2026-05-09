import type { AiActionKind, AiActionPrivacyClass } from '../../enums/ai-action-kind.enum';
import { apiClient } from '../../services/shared/api-client';
import type {
  AiActionResult,
  AutoRouterResolution,
  ModelChoice,
  ResolveAiActionRequest,
} from '../../types/ai-action.types';

const BASE = '/workspace/ai-actions';

export async function resolveAiAction(
  request: ResolveAiActionRequest,
): Promise<AutoRouterResolution> {
  const response = await apiClient.post<AutoRouterResolution>(`${BASE}/resolve`, request);
  return response.data;
}

export type RunAiActionBody = {
  actionKind: AiActionKind;
  privacyClass: AiActionPrivacyClass;
  context: string;
  preferredModel?: ModelChoice;
};

// Backend returns RunAiActionEnvelope: `{mode:'EXECUTED', execution}` or `{mode:'QUEUED', queue}`.
// The dialog flow always wants the actual generated content, so we hit `?execute=immediate`
// and unwrap the EXECUTED branch. If for any reason the backend returns the QUEUED branch
// (e.g. policy gate forced enqueue server-side), we throw so the mutation surfaces an error
// rather than handing the dialog a result without a `generatedBy` field.
type RunAiActionEnvelope =
  | { mode: 'EXECUTED'; execution: AiActionResult }
  | { mode: 'QUEUED'; queue: { queueId: string; status: string } };

export async function runAiAction(request: RunAiActionBody): Promise<AiActionResult> {
  // LLM generation can take well over the 30s default axios timeout (slow
  // local Ollama models routinely sit at 60-120s). Pass `timeout: 0` to
  // disable the client-side cutoff — the backend's
  // AI_ACTION_REQUEST_TIMEOUT_MS (default 300s) and nginx proxy_read_timeout
  // bound the upper end. Frontend just waits for whichever fires first.
  const response = await apiClient.post<RunAiActionEnvelope>(
    `${BASE}/run?execute=immediate`,
    request,
    { timeout: 0 },
  );
  if (response.data.mode === 'EXECUTED') {
    return response.data.execution;
  }
  throw new Error(
    `AI action was queued for approval (queueId=${response.data.queue.queueId}); the dialog cannot display queued results.`,
  );
}
