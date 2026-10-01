import { create } from 'zustand';

import type { FeedbackDialogStore } from '@/types';
import { restoreFocusTo } from '@/utilities/focus-return.utility';

/**
 * Open state of the one feedback dialog.
 *
 * The sidebar entry and the topbar button are siblings of the reporter that
 * renders the dialog, so they share its open state through this store instead
 * of a prop chain through the shell.
 *
 * The dialog has no Radix Trigger, so Radix cannot hand focus back on close.
 * The store remembers the element that was focused when it opened and
 * restores it when the dialog closes.
 */
export const useFeedbackDialogStore = create<FeedbackDialogStore>()((set, get) => ({
  isOpen: false,
  returnFocusTo: null,
  openFeedback: () =>
    set({
      isOpen: true,
      returnFocusTo: typeof document === 'undefined' ? null : document.activeElement,
    }),
  setFeedbackOpen: (open) => {
    if (open) {
      set({ isOpen: true });
      return;
    }
    const target = get().returnFocusTo;
    set({ isOpen: false, returnFocusTo: null });
    restoreFocusTo(target);
  },
}));
