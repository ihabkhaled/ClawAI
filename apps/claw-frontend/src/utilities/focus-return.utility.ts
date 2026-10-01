/**
 * Puts keyboard focus back on `target` after a dialog unmounts.
 *
 * Runs after the next frame and a macrotask so it lands behind Radix's own
 * unmount focus handling. Skips a target that left the document (a closed
 * mobile menu) and never steals focus the user already moved elsewhere.
 */
export function restoreFocusTo(target: Element | null): void {
  if (target === null || typeof window === 'undefined') {
    return;
  }
  window.requestAnimationFrame(() => {
    window.setTimeout(() => {
      if (!(target instanceof HTMLElement) || !target.isConnected) {
        return;
      }
      const active = document.activeElement;
      if (active !== null && active !== document.body && active !== target) {
        return;
      }
      target.focus();
    }, 0);
  });
}
