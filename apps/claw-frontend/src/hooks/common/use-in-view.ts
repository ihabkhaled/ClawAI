import { useCallback, useEffect, useState } from 'react';

import type { UseInViewReturn } from '@/types/file-library-ui.types';

/**
 * True once the element has scrolled into view (or within `rootMargin` of it),
 * and it stays true afterwards: a thumbnail that has been fetched is not
 * dropped again when it scrolls away. Where IntersectionObserver does not exist
 * the element counts as visible, so nothing is withheld on an old browser.
 */
export function useInView(rootMargin: string): UseInViewReturn {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(typeof IntersectionObserver === 'undefined');
  const inViewRef = useCallback((node: HTMLElement | null): void => setElement(node), []);

  useEffect(() => {
    if (element === null || isInView) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsInView(true);
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, isInView, rootMargin]);

  return { inViewRef, isInView };
}
