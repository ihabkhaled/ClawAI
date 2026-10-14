import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

import { locateAndLoadComment } from '@/services/threads/thread-comment-locator.service';

/**
 * A `#comment-<id>` that is not on screen yet (a reply beyond the 3-reply preview, a comment on a
 * later page) is looked up and loaded once per link. Returns true when the linked comment no
 * longer exists, so the page can say so politely.
 */
export function useThreadCommentHashLoader(
  slug: string,
  hashId: string | null,
  loadedIds: string,
  isReady: boolean,
  fetchNextRoots: () => Promise<unknown>,
): boolean {
  const queryClient = useQueryClient();
  const [missingId, setMissingId] = useState<string | null>(null);
  const attempted = useRef<string | null>(null);
  const fetchRef = useRef(fetchNextRoots);
  fetchRef.current = fetchNextRoots;

  useEffect(() => {
    if (hashId === null || !isReady || attempted.current === hashId) {
      return;
    }
    if (loadedIds.split(',').includes(hashId)) {
      return;
    }
    attempted.current = hashId;
    void locateAndLoadComment({
      slug,
      commentId: hashId,
      queryClient,
      fetchNextRoots: () => fetchRef.current(),
    }).then((found) => setMissingId(found ? null : hashId));
  }, [slug, hashId, loadedIds, isReady, queryClient]);

  return missingId !== null && missingId === hashId;
}
