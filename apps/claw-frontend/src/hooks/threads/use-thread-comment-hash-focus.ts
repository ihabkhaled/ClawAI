import { useEffect, useState } from 'react';

import { THREAD_COMMENT_HIGHLIGHT_MS } from '@/constants/thread-community.constants';
import { commentAnchorId } from '@/utilities/thread-comment-tree.utility';

/**
 * When the URL ends in `#comment-<id>` and that comment is on screen, scrolls to it and marks it
 * for a few seconds. Smooth scrolling is skipped for people who asked for less motion.
 * `loadedIds` is the comma-joined ids on screen, so the effect reruns as pages arrive, and
 * `hashId` changing (another notification, same Thread) runs it again for the new target.
 */
export function useThreadCommentHashFocus(hashId: string | null, loadedIds: string): string | null {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    if (hashId === null || !loadedIds.split(',').includes(hashId)) {
      return;
    }
    const element = document.getElementById(commentAnchorId(hashId));
    if (!element) {
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setHighlightedId(hashId);
    const timer = window.setTimeout(() => setHighlightedId(null), THREAD_COMMENT_HIGHLIGHT_MS);
    return (): void => window.clearTimeout(timer);
  }, [hashId, loadedIds]);

  return highlightedId;
}
