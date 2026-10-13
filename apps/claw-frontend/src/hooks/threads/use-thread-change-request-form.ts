import { useState } from 'react';

import type {
  ThreadChangeRequestForm,
  ThreadChangesRevisionSource,
} from '@/types/thread-publication.types';

/** The owner's typed answers to reader suggestions: replies, and the revised article when accepting. */
export function useThreadChangeRequestForm(
  revisionSource: ThreadChangesRevisionSource,
): ThreadChangeRequestForm {
  const [acceptingRequestId, setAcceptingRequestId] = useState('');
  const [revisionMarkdown, setRevisionMarkdown] = useState('');
  const [spendCapUsd, setSpendCapUsd] = useState('');
  const [ownerResponses, setOwnerResponses] = useState<Record<string, string>>({});

  return {
    acceptingRequestId,
    revisionMarkdown,
    spendCapUsd,
    ownerResponses,
    revisionChanged:
      revisionSource !== null && revisionMarkdown.trim() !== revisionSource.markdown.trim(),
    setRevisionMarkdown,
    setSpendCapUsd,
    setOwnerResponse: (requestId, value) =>
      setOwnerResponses((current) => ({ ...current, [requestId]: value })),
    beginAcceptance: (requestId) => {
      setAcceptingRequestId(requestId);
      setRevisionMarkdown(revisionSource?.markdown ?? '');
      setSpendCapUsd('');
    },
    cancelAcceptance: () => {
      setAcceptingRequestId('');
      setSpendCapUsd('');
    },
    finishRequest: (requestId) => {
      setAcceptingRequestId('');
      setSpendCapUsd('');
      setOwnerResponses((current) =>
        Object.fromEntries(Object.entries(current).filter(([id]) => id !== requestId)),
      );
    },
  };
}
