import { useCallback, useState } from 'react';

import type { UseCreditClampedNoticeReturn } from '@/types/credit-hook.types';

// Dismissal state for the "this answer was shortened" notice.
//
// Dismissible but not silent: chat-service clamps `maxOutputTokens` to what the
// balance can pay for, so the model physically cannot overspend — but a reply
// that simply stops mid-thought reads as the model being bad rather than the
// wallet being nearly empty. Local state rather than persisted, because the
// notice belongs to this rendering of the message, not to the message itself.
export function useCreditClampedNotice(): UseCreditClampedNoticeReturn {
  const [isVisible, setIsVisible] = useState(true);

  const dismiss = useCallback((): void => {
    setIsVisible(false);
  }, []);

  return { isVisible, dismiss };
}
