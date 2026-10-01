'use client';

import { FeedbackMemberDialog } from '@/components/feedback/feedback-member-dialog';
import { FeedbackPublicDialog } from '@/components/feedback/feedback-public-dialog';
import { useIsSignedIn } from '@/hooks/auth/use-is-signed-in';
import type { FeedbackDialogProps } from '@/types/feedback-props.types';

// One dialog, two modes decided by the session. A signed-in member uses the
// guarded API (the server knows who they are, so no name or email is asked);
// a visitor gets name and email fields, no file controls, and the public API.
export function FeedbackDialog(props: FeedbackDialogProps): React.ReactElement {
  const isSignedIn = useIsSignedIn();

  return isSignedIn ? <FeedbackMemberDialog {...props} /> : <FeedbackPublicDialog {...props} />;
}
