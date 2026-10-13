import { create } from 'zustand';

import type { ContextSaveProposalStore } from '@/types';

/**
 * Which answer's "Remember this" dialog is open (ADR-168).
 *
 * The dialog opens automatically for a fresh proposal and also from the card's
 * "Review and save" button. The card sits deep in the transcript and the dialog
 * is mounted by the thread page, so the hand-off is a small client store
 * rather than a prop chain. `isBusy` is true while the dialog's own save or
 * dismissal is in flight, so a refetch that briefly shows the record as SAVING
 * cannot unmount the dialog and lose the user's edits or the outcome. `errors`
 * holds the reason a confirm failed, keyed by message id, so it is still on
 * screen if the dialog remounts after the failure; it is cleared on the next
 * attempt and on close.
 */
export const useContextSaveProposalStore = create<ContextSaveProposalStore>()((set) => ({
  openMessageId: null,
  isBusy: false,
  errors: {},
  open: (messageId) => set({ openMessageId: messageId }),
  close: () => set({ openMessageId: null, isBusy: false, errors: {} }),
  setBusy: (isBusy) => set({ isBusy }),
  setError: (messageId, message) =>
    set((state) => ({ errors: { ...state.errors, [messageId]: message } })),
  clearError: (messageId) =>
    set((state) => ({
      errors: Object.fromEntries(Object.entries(state.errors).filter(([id]) => id !== messageId)),
    })),
}));
