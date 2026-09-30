import { RUNTIME_V2_RESULT_FILES_NOTE_PREFIX } from '../constants/runtime-v2-result-files.constants';
import { latestUserFileIds } from '../helpers/runtime-thread-context.helper';
import type { RuntimeHistoryMessage } from '../types/runtime-thread-context.types';

/**
 * The attachment list a continuation turn is assembled with (F030).
 *
 * Empty object when the tool result carried no files, so the gateway keeps
 * choosing the run's own attachments exactly as before. When it did, the
 * explicit list must still include the prompt's attachments: an explicit list
 * replaces the gateway's default, and dropping the user's files on the one
 * turn that also has a screenshot would be a silent regression.
 */
export function runtimeV2ContinuationFileIds(
  history: readonly RuntimeHistoryMessage[],
  resultFileIds: readonly string[] | undefined,
): { fileIds?: string[] } {
  if (resultFileIds === undefined || resultFileIds.length === 0) return {};
  const promptFileIds = latestUserFileIds(history) ?? [];
  return { fileIds: [...new Set([...promptFileIds, ...resultFileIds])] };
}

/** The system-prompt line naming the result's images, or null when there are none. */
export function runtimeV2ResultFilesNote(
  resultFileIds: readonly string[] | undefined,
): string | null {
  return resultFileIds === undefined || resultFileIds.length === 0
    ? null
    : `${RUNTIME_V2_RESULT_FILES_NOTE_PREFIX} ${resultFileIds.join(', ')}.`;
}
