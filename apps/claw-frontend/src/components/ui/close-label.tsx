'use client';

import { useCloseLabel } from '@/hooks/use-close-label';

/** Screen-reader text for a dialog or sheet close button, in the active locale. */
export function CloseLabel(): React.ReactElement {
  return <span className="sr-only">{useCloseLabel()}</span>;
}
