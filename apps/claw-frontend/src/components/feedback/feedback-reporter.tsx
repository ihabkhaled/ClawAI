'use client';

import { FeedbackDialog } from '@/components/feedback/feedback-dialog';
import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

// Renders the single feedback dialog for the portal. The sidebar entry and the
// topbar button open it through the feedback dialog store. Mounted once in the
// portal shell.
//
// The dialog is only rendered while open: it owns a form mutation and upload
// state, and mounting that on every page would run react-query machinery for a
// dialog nobody opened.
export function FeedbackReporter(): React.ReactElement | null {
  const isOpen = useFeedbackDialogStore((state) => state.isOpen);
  const setFeedbackOpen = useFeedbackDialogStore((state) => state.setFeedbackOpen);

  return isOpen ? <FeedbackDialog open onOpenChange={setFeedbackOpen} /> : null;
}
