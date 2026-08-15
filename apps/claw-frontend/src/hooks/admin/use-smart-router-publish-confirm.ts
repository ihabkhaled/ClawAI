import { useCallback, useState } from 'react';

import type { UseSmartRouterPublishConfirmResult } from '@/types/smart-router-admin.types';

/** Local open/close state for the Publish tab's confirmation dialog — widget
 * state, not page state, so it lives in its own hook rather than the page
 * controller (mirrors useShareChatDialog's isOpen/open/close). */
export function useSmartRouterPublishConfirm(): UseSmartRouterPublishConfirmResult {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback((): void => setIsOpen(true), []);
  const close = useCallback((): void => setIsOpen(false), []);

  return { isOpen, open, close };
}
