'use client';

import dynamic from 'next/dynamic';

import { useFeedbackDialogStore } from '@/stores/feedback-dialog.store';

// The dialog, its form libraries and the markdown editor load only when a
// visitor first opens feedback, so a marketing page pays nothing for them.
const FeedbackReporter = dynamic(
  () => import('@/components/feedback/feedback-reporter').then((mod) => mod.FeedbackReporter),
  { ssr: false },
);

export function MarketingFeedbackReporter(): React.ReactElement | null {
  const isOpen = useFeedbackDialogStore((state) => state.isOpen);

  return isOpen ? <FeedbackReporter /> : null;
}
