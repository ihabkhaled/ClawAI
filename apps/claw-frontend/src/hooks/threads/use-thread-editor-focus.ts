import { useEffect } from 'react';

import {
  THREAD_REVISION_EDITOR_ID,
  THREAD_REVISION_TEXTAREA_ID,
} from '@/constants/thread-change-requests.constants';

/** When the editor opens it is brought into view (its top) and focused, so the click visibly did something. */
export function useThreadEditorFocus(isEditing: boolean): void {
  useEffect(() => {
    if (!isEditing) {
      return;
    }
    document.getElementById(THREAD_REVISION_EDITOR_ID)?.scrollIntoView?.({ block: 'start' });
    document.getElementById(THREAD_REVISION_TEXTAREA_ID)?.focus({ preventScroll: true });
  }, [isEditing]);
}
