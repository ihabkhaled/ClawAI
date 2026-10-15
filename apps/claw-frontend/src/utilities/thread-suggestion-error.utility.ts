import { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import { ApiClientError } from '@/services/shared/api-client';

/** Why a suggestion was refused, when the reader can do something about it; else null (the generic message). */
export function suggestionErrorKey(
  error: Error | null,
  kind: ThreadPublicationCommunityAction | undefined,
): string | null {
  if (
    !(error instanceof ApiClientError) ||
    kind !== ThreadPublicationCommunityAction.ChangeRequest
  ) {
    return null;
  }
  if (error.status === 403) {
    return 'chat.threadCrErrorOwn';
  }
  return error.status === 429 ? 'chat.threadCrErrorLimit' : null;
}
