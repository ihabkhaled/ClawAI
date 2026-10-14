import { useEffect, useState } from 'react';

import { THREAD_COMMENT_HIGHLIGHT_MS } from '@/constants/thread-community.constants';
import { commentAnchorId, commentIdFromHash } from '@/utilities/thread-comment-tree.utility';

/**
 * When the URL ends in `#comment-<id>` and that comment is on screen, scrolls to it and marks it
 * for a few seconds. Smooth scrolling is skipped for people who asked for less motion.
 * `loadedIds` is the comma-joined ids on screen, so the effect reruns as pages arrive.
 */
export function useThreadCommentHashFocus(loadedIds: string): string | null {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  useEffect(() => {
    const id = commentIdFromHash(window.location.hash);
    if (id === null || !loadedIds.split(',').includes(id)) {
      return;
    }
    const element = document.getElementById(commentAnchorId(id));
    if (!element) {
      return;
    }
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setHighlightedId(id);
    const timer = window.setTimeout(() => setHighlightedId(null), THREAD_COMMENT_HIGHLIGHT_MS);
    return (): void => window.clearTimeout(timer);
  }, [loadedIds]);

  return highlightedId;
}
