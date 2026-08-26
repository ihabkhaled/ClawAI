import { useState } from 'react';

import { useAdminFeedbackDetail } from '@/hooks/admin/feedback/use-admin-feedback-detail';
import type { UseAdminFeedbackDetailDialogReturn } from '@/types/feedback-hook.types';
import type { AdminFeedbackImagePreview } from '@/types/feedback-props.types';

// Controller for the ticket dialog: the ticket query plus the attachment the
// admin is previewing. The dialog TSX kept its own useState for that preview,
// which rule 12 in the frontend CLAUDE.md does not allow.
export function useAdminFeedbackDetailDialog(ticketId: string): UseAdminFeedbackDetailDialogReturn {
  const { ticket, isLoading, changeStatus, isChanging } = useAdminFeedbackDetail(ticketId);
  const [imagePreview, setImagePreview] = useState<AdminFeedbackImagePreview | null>(null);

  return {
    ticket,
    isLoading,
    changeStatus,
    isChanging,
    imagePreview,
    openImagePreview: (src: string, alt: string) => setImagePreview({ src, alt }),
    closeImagePreview: () => setImagePreview(null),
  };
}
