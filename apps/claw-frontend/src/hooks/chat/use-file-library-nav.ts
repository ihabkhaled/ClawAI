import { useCallback, useEffect, useState } from 'react';

import type { UseFileLibraryNavReturn } from '@/types/file-library-ui.types';
import { moveFileLibraryFocus } from '@/utilities/file-library.utility';

/**
 * Arrow-key navigation across the search box, the file rows and the action
 * rows of the library, in DOM order. It stops a key from reaching the host ONLY
 * when it moved focus inside the library. ArrowUp on the first element and
 * ArrowDown on the last bubble out, so a hosting menu can continue into its
 * other sections; Tab, Escape and every other key are never touched (swallowing
 * Tab would break the focus loop of a hosting dialog).
 *
 * A native listener on the container, not a React prop: it runs before the
 * host's delegated React handlers (so stopping propagation reaches them), and
 * a native listener only hears keys typed inside the container's own DOM, never
 * those from a dialog portalled out of it.
 */
export function useFileLibraryNav(): UseFileLibraryNavReturn {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((element: HTMLDivElement | null): void => {
    setContainer(element);
  }, []);

  useEffect(() => {
    if (container === null) {
      return;
    }
    const listener = (event: KeyboardEvent): void => {
      if (moveFileLibraryFocus(container, event)) {
        event.stopPropagation();
      }
    };
    container.addEventListener('keydown', listener);
    return () => container.removeEventListener('keydown', listener);
  }, [container]);

  return { containerRef };
}
