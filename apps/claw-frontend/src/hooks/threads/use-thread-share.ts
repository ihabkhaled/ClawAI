import { useState } from 'react';

import type { ThreadShareController, ThreadShareMenuProps } from '@/types/thread-export.types';

/** Copy-link and the browser's own share sheet, with the state the menu needs to say what happened. */
export function useThreadShare({ url, title }: ThreadShareMenuProps): ThreadShareController {
  const [hasCopied, setHasCopied] = useState(false);
  const [hasCopyFailed, setHasCopyFailed] = useState(false);
  const canShareNatively =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  async function copyLink(): Promise<void> {
    setHasCopyFailed(false);
    try {
      await navigator.clipboard.writeText(url);
      setHasCopied(true);
    } catch {
      setHasCopied(false);
      setHasCopyFailed(true);
    }
  }

  async function shareNatively(): Promise<void> {
    try {
      await navigator.share({ title, url });
    } catch {
      // Closing the share sheet is a cancel, not an error worth showing.
    }
  }

  return { hasCopied, hasCopyFailed, canShareNatively, copyLink, shareNatively };
}
