import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/**
 * After the owner changes page, move focus to the results heading (without scrolling) once the new
 * rows are in. It never steals focus from a field the owner is typing in.
 */
export function useThreadListFocus(
  page: number,
  isSettled: boolean,
  target: RefObject<HTMLElement | null>,
): void {
  const lastPage = useRef(page);
  const pending = useRef(false);

  useEffect(() => {
    if (lastPage.current !== page) {
      lastPage.current = page;
      pending.current = true;
    }
    if (!pending.current || !isSettled) {
      return;
    }
    pending.current = false;
    const active = document.activeElement;
    const free =
      active === null ||
      active === document.body ||
      active.closest('[data-testid="pagination"]') !== null;
    if (free) {
      target.current?.focus({ preventScroll: true });
    }
  }, [page, isSettled, target]);
}
