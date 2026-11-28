import { ResearchMode } from '../../../common/enums/research-mode.enum';
import type { ChatMessage } from '../../../generated/prisma';
import type { ResearchRunResponse } from '../types/research.types';
import { bundleOf, mergeResearchRuns } from './research-orchestration.utility';

function metadataOf(message: { metadata?: unknown }): Record<string, unknown> {
  const metadata = message.metadata;
  return typeof metadata === 'object' && metadata !== null && !Array.isArray(metadata)
    ? (metadata as Record<string, unknown>)
    : {};
}

/**
 * An assistant message that only promised a search (ADR-227). It carries no information, and leaving it out of later
 * prompts also keeps user and assistant turns alternating.
 */
export function isSearchPromiseMessage(message: { role: string; metadata?: unknown }): boolean {
  return message.role === 'ASSISTANT' && metadataOf(message)['searchContinuation'] !== undefined;
}

/** True when the user sent this turn with web research on (AUTO or an explicit mode). */
export function userAllowedWeb(userMetadata: Record<string, unknown> | null): boolean {
  const mode = userMetadata?.['researchMode'];
  return typeof mode === 'string' && mode !== ResearchMode.NONE;
}

/** The run stored on a user message, in the shape the engine returns, or null. */
function storedRun(metadata: Record<string, unknown>): ResearchRunResponse | null {
  const research = metadata['research'] as
    { runId?: string; mode?: string; bundle?: unknown } | undefined;
  if (research?.runId === undefined || research.bundle === undefined) {
    return null;
  }
  const run = {
    id: research.runId,
    workflow: research.mode ?? '',
    bundle: research.bundle,
  } as unknown as ResearchRunResponse;
  return bundleOf(run) === null ? null : run;
}

/**
 * The routed window with the follow-up search added to its last user message, so context assembly fits and numbers
 * the evidence exactly as it does for research that ran before the first answer. In memory only.
 */
export function withPromisedSearch(
  messages: readonly ChatMessage[],
  run: ResearchRunResponse,
): ChatMessage[] {
  const lastUser = messages.map((message) => message.role).lastIndexOf('USER');
  return messages.map((message, index) => {
    if (index !== lastUser) {
      return message;
    }
    const metadata = metadataOf(message);
    const merged = mergeResearchRuns(storedRun(metadata), run) ?? run;
    return {
      ...message,
      metadata: {
        ...metadata,
        research: { runId: merged.id, mode: merged.workflow, bundle: merged.bundle },
      } as ChatMessage['metadata'],
    };
  });
}
