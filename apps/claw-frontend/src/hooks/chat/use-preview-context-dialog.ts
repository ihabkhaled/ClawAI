import { useEffect } from 'react';

import { usePreviewContext } from '@/hooks/chat/use-preview-context';

/** Asks the server for a fresh dry-run of the context each time the preview dialog opens. */
export function usePreviewContextDialog(
  threadId: string,
  draft: string,
  open: boolean,
): ReturnType<typeof usePreviewContext> {
  const preview = usePreviewContext(threadId);
  const { mutate } = preview;
  useEffect(() => {
    if (open) {
      mutate({ draft });
    }
  }, [open, draft, mutate]);
  return preview;
}
