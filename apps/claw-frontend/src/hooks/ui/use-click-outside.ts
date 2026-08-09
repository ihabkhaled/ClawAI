import * as React from 'react';

// Fires `handler` when a pointer press lands outside `ref`. Listens on
// `pointerdown` rather than `click` so the collapse happens on press — a
// `click` listener misses presses that end outside the original target, and
// feels laggy on touch.
//
// `enabled` lets callers keep hook order stable while the behaviour is
// conditional (e.g. only while a popover is open).
export function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: (event: PointerEvent) => void,
  enabled = true,
): void {
  // Stash the latest handler so consumers can pass a fresh closure each render
  // without re-registering the listener.
  const handlerRef = React.useRef(handler);
  React.useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  React.useEffect(() => {
    if (!enabled || typeof document === 'undefined') {
      return;
    }

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (ref.current && !ref.current.contains(target)) {
        handlerRef.current(event);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [ref, enabled]);
}
