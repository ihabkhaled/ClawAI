import { create } from 'zustand';

import type { FeedbackDialogStore } from '@/types';

/**
 * Open state of the one feedback dialog.
 *
 * The sidebar entry and the topbar button are siblings of the reporter that
 * renders the dialog, so they share its open state through this store instead
 * of a prop chain through the shell.
 */
export const useFeedbackDialogStore = create<FeedbackDialogStore>()((set) => ({
  isOpen: false,
  openFeedback: () => set({ isOpen: true }),
  setFeedbackOpen: (open) => set({ isOpen: open }),
}));
