import * as React from 'react';

import type { UseCopyButtonReturn } from '@/types/hook.types';

// Pulled out so the <CopyButton /> .tsx stays render-only (per the no-hooks-
// in-.tsx rule). Owns the "Copied!" toggle that resets after 2 seconds and the
// clipboard write itself. Falls back silently when navigator.clipboard is
// unavailable (e.g. insecure context, older Safari) — the caller still gets
// `copied: false` and can treat it like a no-op.
export function useCopyButton(text: string): UseCopyButtonReturn {
  const [copied, setCopied] = React.useState<boolean>(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const onClick = React.useCallback(async (): Promise<void> => {
    if (typeof navigator === 'undefined' || navigator.clipboard === undefined) {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      // Clipboard write rejected (permissions, focus, etc.). Surface a console
      // warning so a developer notices, but never throw — copy is a best-effort
      // affordance, not a critical mutation.
      console.warn('useCopyButton: clipboard.writeText rejected');
    }
  }, [text]);

  return { copied, onClick };
}
