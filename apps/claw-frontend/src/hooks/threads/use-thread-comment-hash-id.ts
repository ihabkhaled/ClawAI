import { useEffect, useState } from 'react';

import { commentIdFromHash } from '@/utilities/thread-comment-tree.utility';

/** The comment id in the URL fragment (`#comment-<id>`), kept current as the fragment changes. */
export function useThreadCommentHashId(): string | null {
  const [hashId, setHashId] = useState<string | null>(null);

  useEffect(() => {
    const read = (): void => setHashId(commentIdFromHash(window.location.hash));
    read();
    window.addEventListener('hashchange', read);
    window.addEventListener('popstate', read);
    return (): void => {
      window.removeEventListener('hashchange', read);
      window.removeEventListener('popstate', read);
    };
  }, []);

  return hashId;
}
