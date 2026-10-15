import { describe, expect, it } from 'vitest';

import { ThreadPublicationCommunityAction } from '@/enums/thread-publication-community-action.enum';
import { ApiClientError } from '@/services/shared/api-client';
import { suggestionErrorKey } from '@/utilities/thread-suggestion-error.utility';

function failure(status: number): ApiClientError {
  return new ApiClientError({ message: 'x', status });
}

describe('suggestionErrorKey', () => {
  const kind = ThreadPublicationCommunityAction.ChangeRequest;

  it("explains a refusal on the reader's own Thread (403) and a full queue (429)", () => {
    expect(suggestionErrorKey(failure(403), kind)).toBe('chat.threadCrErrorOwn');
    expect(suggestionErrorKey(failure(429), kind)).toBe('chat.threadCrErrorLimit');
  });

  it('uses the generic message for anything else', () => {
    expect(suggestionErrorKey(failure(500), kind)).toBeNull();
    expect(suggestionErrorKey(new Error('network'), kind)).toBeNull();
    expect(suggestionErrorKey(null, kind)).toBeNull();
  });

  it('only speaks about a suggestion, never about a comment or a report', () => {
    expect(suggestionErrorKey(failure(429), ThreadPublicationCommunityAction.Comment)).toBeNull();
    expect(suggestionErrorKey(failure(403), undefined)).toBeNull();
  });
});
